#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { makeGitHub } from '../lib/github.js';
import { loadGitHubConfig } from './config.js';
import {
  createCards, findCard, listTags, nextReviewCard, rateCard, resolveTags, searchCards, updateCard,
} from './domain.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false };
const UPDATE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true };
const DELETE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true };

function result(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function error(message, data = {}) {
  const body = { ok: false, error: message, ...data };
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
    structuredContent: body,
  };
}

function publicCard(card, reveal = true) {
  const copy = {
    id: card.id,
    question: card.question,
    tags: card.tags || [],
    source: card.source || null,
    state: card.state,
    due: card.due,
    created: card.created,
  };
  if (reveal) copy.answer = card.answer;
  return copy;
}

function createServer() {
  const server = new McpServer(
    { name: 'srs', version: '1.0.0' },
    {
      instructions: 'Use list_tags before creating or retagging cards and prefer an existing tag. To review in chat: get_review_card, let the user answer, reveal_card, then rate_card. Never reveal the answer before the user has tried.',
    },
  );

  let api;
  function github() {
    if (!api) api = makeGitHub(loadGitHubConfig());
    return api;
  }

  server.registerTool('list_tags', {
    title: 'List tags',
    description: 'List every existing tag and its card count. Call this before creating or retagging cards so existing categories are reused instead of inventing synonyms.',
    inputSchema: z.object({}),
    annotations: READ_ONLY,
  }, async () => {
    const { cards } = await github().getCards();
    return result({ ok: true, tags: listTags(cards) });
  });

  server.registerTool('list_cards', {
    title: 'Find cards',
    description: 'List or search cards by text, tag, or learning state. Returns full answers, so do not use it to begin a review.',
    inputSchema: z.object({
      query: z.string().optional().describe('Text to find in questions, answers, tags, or sources.'),
      tag: z.string().optional().describe('Exact existing tag.'),
      state: z.enum(['new', 'learning', 'review', 'relearning']).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }),
    annotations: READ_ONLY,
  }, async (input) => {
    const { cards } = await github().getCards();
    return result({ ok: true, cards: searchCards(cards, input).map((card) => publicCard(card)) });
  });

  server.registerTool('get_card', {
    title: 'Get card',
    description: 'Get one complete card by id, including its answer and scheduling state.',
    inputSchema: z.object({ card_id: z.string().min(1) }),
    annotations: READ_ONLY,
  }, async ({ card_id }) => {
    const { cards } = await github().getCards();
    return result({ ok: true, card: publicCard(findCard(cards, card_id)) });
  });

  server.registerTool('create_card', {
    title: 'Create card',
    description: 'Create one card. Call list_tags first. Unknown tags are rejected once with the existing tag list unless allow_new_tags is true.',
    inputSchema: z.object({
      question: z.string().min(1).describe('One precise recall prompt. Markdown is allowed.'),
      answer: z.string().min(1).describe('The shortest complete answer. Markdown is allowed.'),
      tags: z.array(z.string()).default([]),
      source: z.string().optional(),
      allow_new_tags: z.boolean().default(false).describe('Set true only after checking the returned existing tags.'),
    }),
    annotations: WRITE,
  }, async ({ allow_new_tags, ...authoring }) => {
    const { cards } = await github().getCards();
    const built = createCards([authoring], cards, allow_new_tags);
    if (built.needsConfirmation) {
      return error('Unknown tags need confirmation.', {
        unknown_tags: built.unknown,
        existing_tags: built.existing,
        retry: 'Reuse existing tags, or call again with allow_new_tags: true.',
      });
    }
    const card = built.cards[0];
    await github().safeWrite((current) => [...current, card], `Add card: ${card.question.slice(0, 60)}`);
    return result({ ok: true, card: publicCard(card), tags: listTags([...cards, card]) });
  });

  server.registerTool('create_cards', {
    title: 'Create cards',
    description: 'Create several cards in one fast write. Call list_tags first. If any tag is new, nothing is written until allow_new_tags is true.',
    inputSchema: z.object({
      cards: z.array(z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        tags: z.array(z.string()).default([]),
        source: z.string().optional(),
      })).min(1).max(100),
      allow_new_tags: z.boolean().default(false),
    }),
    annotations: WRITE,
  }, async ({ cards: authoring, allow_new_tags }) => {
    const { cards } = await github().getCards();
    const built = createCards(authoring, cards, allow_new_tags);
    if (built.needsConfirmation) {
      return error('Unknown tags need confirmation.', {
        unknown_tags: built.unknown,
        existing_tags: built.existing,
        retry: 'Reuse existing tags, or call again with allow_new_tags: true.',
      });
    }
    await github().safeWrite((current) => [...current, ...built.cards], `Add ${built.cards.length} cards`);
    return result({ ok: true, count: built.cards.length, cards: built.cards.map((card) => publicCard(card)) });
  });

  server.registerTool('update_card', {
    title: 'Update card',
    description: 'Edit a card without resetting its review history. Unknown tags require an explicit second call.',
    inputSchema: z.object({
      card_id: z.string().min(1),
      question: z.string().min(1).optional(),
      answer: z.string().min(1).optional(),
      tags: z.array(z.string()).optional(),
      source: z.string().optional(),
      allow_new_tags: z.boolean().default(false),
    }),
    annotations: UPDATE,
  }, async ({ card_id, allow_new_tags, ...fields }) => {
    const { cards } = await github().getCards();
    const current = findCard(cards, card_id);
    const updated = updateCard(current, fields, cards, allow_new_tags);
    if (updated.needsConfirmation) {
      return error('Unknown tags need confirmation.', {
        unknown_tags: updated.unknown,
        existing_tags: updated.existing,
        retry: 'Reuse existing tags, or call again with allow_new_tags: true.',
      });
    }
    await github().safeWrite(
      (latest) => latest.map((card) => (card.id === card_id ? updated.card : card)),
      `Update card: ${updated.card.question.slice(0, 60)}`,
    );
    return result({ ok: true, card: publicCard(updated.card) });
  });

  server.registerTool('delete_card', {
    title: 'Delete card',
    description: 'Permanently delete one card by id.',
    inputSchema: z.object({ card_id: z.string().min(1) }),
    annotations: DELETE,
  }, async ({ card_id }) => {
    const { cards } = await github().getCards();
    const card = findCard(cards, card_id);
    await github().safeWrite((latest) => latest.filter((item) => item.id !== card_id), `Delete card: ${card.question.slice(0, 60)}`);
    return result({ ok: true, deleted: publicCard(card) });
  });

  server.registerTool('get_review_card', {
    title: 'Start or continue a review',
    description: 'Return the next due question without its answer. Ask the user to answer before calling reveal_card.',
    inputSchema: z.object({ tag: z.string().optional().describe('Optional exact tag to review.') }),
    annotations: READ_ONLY,
  }, async ({ tag }) => {
    const { cards } = await github().getCards();
    const existing = listTags(cards).map((item) => item.name);
    const resolvedTag = tag ? resolveTags([tag], existing).resolved[0] : undefined;
    const card = nextReviewCard(cards, resolvedTag);
    if (!card) return result({ ok: true, done: true, message: 'No cards are due.' });
    return result({ ok: true, done: false, card: publicCard(card, false) });
  });

  server.registerTool('reveal_card', {
    title: 'Reveal answer',
    description: 'Reveal a review card answer after the user has tried to recall it.',
    inputSchema: z.object({ card_id: z.string().min(1) }),
    annotations: READ_ONLY,
  }, async ({ card_id }) => {
    const { cards } = await github().getCards();
    const card = findCard(cards, card_id);
    return result({ ok: true, card: publicCard(card) });
  });

  server.registerTool('rate_card', {
    title: 'Rate review',
    description: 'Record how well the user recalled a revealed card and schedule its next review with FSRS.',
    inputSchema: z.object({
      card_id: z.string().min(1),
      rating: z.enum(['again', 'hard', 'good', 'easy']),
    }),
    annotations: UPDATE,
  }, async ({ card_id, rating }) => {
    const { cards } = await github().getCards();
    const current = findCard(cards, card_id);
    const updated = rateCard(current, rating);
    await github().safeWrite(
      (latest) => latest.map((card) => (card.id === card_id ? updated : card)),
      `Review card: ${current.question.slice(0, 60)} (${rating})`,
    );
    return result({ ok: true, rating, next_due: updated.due, card: publicCard(updated) });
  });

  return server;
}

void serveStdio(createServer);
console.error('SRS MCP running on stdio');
