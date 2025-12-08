#!/usr/bin/env python3
"""ChatGPT Wrapped local ETL utility.

Reads an exported ChatGPT data bundle (folder or ZIP) and emits compact JSON files
that match the Next.js frontend contracts in apps/web/public/data/.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import re
import sys
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None

WORD_PATTERN = re.compile(r"[A-Za-z0-9_']+")

SENTIMENT_LEXICON = {
    'love': 0.8,
    'great': 0.6,
    'awesome': 0.6,
    'thanks': 0.4,
    'good': 0.3,
    'nice': 0.3,
    'cool': 0.3,
    'happy': 0.3,
    'excited': 0.5,
    'bad': -0.4,
    'broken': -0.5,
    'bug': -0.4,
    'error': -0.5,
    'fail': -0.5,
    'stuck': -0.3,
    'terrible': -0.8,
    'sad': -0.5,
    'worry': -0.2
}

TOPIC_COLOR_POOL = ['#8b5cf6', '#f472b6', '#22d3ee', '#facc15', '#34d399', '#f97316', '#2dd4bf', '#c084fc', '#fb7185']

STOPWORDS = {
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'you', 'your', 'are', 'have', 'was', 'were', 'about', 'into',
    'what', 'when', 'which', 'their', 'will', 'just', 'but', 'can', 'all', 'any', 'per', 'tot', 'one',
    'how', 'why', 'who', 'where', 'there', 'here', 'been', 'being', 'would', 'could', 'should', 'might',
    'must', 'shall', 'may', 'does', 'did', 'has', 'had', 'having', 'doing', 'done', 'made', 'make',
    'them', 'they', 'its', 'also', 'than', 'then', 'now', 'only', 'very', 'just', 'more', 'most',
    'some', 'such', 'other', 'each', 'every', 'both', 'few', 'many', 'much', 'own', 'same', 'well',
    'back', 'even', 'still', 'way', 'take', 'come', 'want', 'give', 'use', 'used', 'using', 'get',
    'got', 'getting', 'going', 'know', 'think', 'see', 'look', 'like', 'need', 'try', 'let', 'keep',
    'say', 'said', 'tell', 'ask', 'asked', 'work', 'working', 'works', 'first', 'last', 'new', 'old',
    'good', 'great', 'best', 'better', 'right', 'wrong', 'sure', 'yes', 'not', 'don', 'doesn', 'didn',
    'won', 'isn', 'aren', 'wasn', 'weren', 'haven', 'hasn', 'hadn', 'wouldn', 'couldn', 'shouldn',
    'ain', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'he', 'him', 'his', 'himself',
    'she', 'her', 'hers', 'herself', 'it', 'itself', 'these', 'those', 'am', 'is', 'be', 'or', 'as',
    'of', 'at', 'by', 'to', 'up', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
    'once', 'during', 'before', 'after', 'above', 'below', 'between', 'through', 'while', 'no',
    'nor', 'so', 'too', 'if', 'because', 'until', 'against', 'without', 'within', 'along', 'around',
    'const', 'let', 'var', 'function', 'return', 'import', 'export', 'class', 'def', 'self',
    'async', 'await', 'true', 'false', 'null', 'undefined', 'none', 'int', 'str', 'bool', 'float',
    'list', 'dict', 'array', 'object', 'string', 'number', 'type', 'interface', 'enum', 'void',
    'public', 'private', 'static', 'final', 'abstract', 'extends', 'implements', 'super', 'new',
    'try', 'catch', 'throw', 'throws', 'finally', 'if', 'else', 'elif', 'switch', 'case', 'default',
    'while', 'for', 'do', 'break', 'continue', 'pass', 'yield', 'lambda', 'with', 'as', 'from',
    'print', 'println', 'console', 'log', 'error', 'warn', 'info', 'debug',
    'data', 'value', 'values', 'key', 'keys', 'item', 'items', 'index', 'name', 'names',
    'file', 'files', 'path', 'paths', 'url', 'urls', 'id', 'ids', 'code', 'codes',
    'result', 'results', 'output', 'input', 'inputs', 'outputs', 'param', 'params', 'arg', 'args',
    'text', 'message', 'messages', 'response', 'request', 'query', 'queries',
    'add', 'added', 'adding', 'create', 'created', 'creating', 'update', 'updated', 'updating',
    'delete', 'deleted', 'deleting', 'remove', 'removed', 'removing', 'set', 'sets', 'setting',
    'change', 'changed', 'changing', 'fix', 'fixed', 'fixing', 'check', 'checked', 'checking',
    'show', 'showing', 'shows', 'display', 'displayed', 'displaying', 'render', 'rendered',
    'test', 'tests', 'testing', 'run', 'runs', 'running', 'call', 'calls', 'calling',
    'start', 'started', 'starting', 'end', 'ended', 'ending', 'stop', 'stopped', 'stopping',
    'read', 'reads', 'reading', 'write', 'writes', 'writing', 'load', 'loads', 'loading',
    'save', 'saves', 'saving', 'send', 'sends', 'sending', 'receive', 'receives', 'receiving',
    'find', 'finds', 'finding', 'search', 'searching', 'filter', 'filters', 'filtering',
    'sort', 'sorts', 'sorting', 'map', 'maps', 'mapping', 'reduce', 'reduces', 'reducing',
    'parse', 'parses', 'parsing', 'format', 'formats', 'formatting', 'convert', 'converts',
    'handle', 'handles', 'handling', 'process', 'processes', 'processing', 'build', 'builds',
    'example', 'examples', 'sample', 'samples', 'something', 'anything', 'nothing', 'everything',
    'thing', 'things', 'stuff', 'part', 'parts', 'section', 'sections', 'line', 'lines',
    'help', 'helps', 'helping', 'please', 'thanks', 'thank', 'sorry', 'okay', 'yeah', 'yep',
    'actually', 'basically', 'really', 'probably', 'maybe', 'perhaps', 'definitely', 'certainly',
    'currently', 'already', 'always', 'never', 'sometimes', 'often', 'usually', 'instead',
    'however', 'therefore', 'otherwise', 'although', 'though', 'since', 'unless', 'whether',
    'able', 'possible', 'different', 'similar', 'simple', 'complex', 'basic', 'main', 'specific',
    'various', 'certain', 'entire', 'whole', 'another', 'multiple', 'single', 'several',
    'cite', 'cites', 'cited', 'citing', 'speaker', 'speakers', 'frac', 'turn', 'turns',
    '000', '001', '002', '003', '004', '005', '006', '007', '008', '009',
    'app', 'apps', 'api', 'apis', 'node', 'nodes', 'time', 'times'
}

MODE_RULES = [
    ('code', re.compile(r"```|function |class |def |const |#include|npm |sql|select ", re.IGNORECASE)),
    ('debug', re.compile(r"error|stack trace|exception|traceback|failing|bug", re.IGNORECASE)),
    ('plan', re.compile(r"plan|roadmap|steps|milestone|timeline", re.IGNORECASE)),
    ('reflect', re.compile(r"i feel|i learned|reflect|retro|lesson", re.IGNORECASE))
]


@dataclass
class NormalizedMessage:
    id: str
    conversation_id: str
    role: str
    created_at: int
    text: str
    word_count: int


@dataclass
class NormalizedConversation:
    id: str
    title: str
    created_at: int
    updated_at: int | None
    messages: List[NormalizedMessage]


def words(text: str) -> List[str]:
    return WORD_PATTERN.findall(text or '')


def ensure_seconds(timestamp: Any) -> int:
    if timestamp in (None, ''):
        return int(datetime.now(tz=timezone.utc).timestamp())
    try:
        ts = float(timestamp)
    except (TypeError, ValueError):
        return int(datetime.now(tz=timezone.utc).timestamp())
    return int(ts / 1000) if ts > 10_000_000_000 else int(ts)


def extract_text(message: Dict[str, Any]) -> str:
    content = message.get('content') or {}
    parts: Sequence[Any] = content.get('parts') or []
    out: List[str] = []
    for part in parts:
        if isinstance(part, str):
            out.append(part)
        elif isinstance(part, dict):
            text = part.get('text')
            if text:
                out.append(text)
    return '\n'.join(out).strip()


def sanitize_role(role: Any) -> str:
    if isinstance(role, str) and role in {'user', 'assistant', 'system', 'tool'}:
        return role
    return 'unknown'


def normalize_conversations(raw_conversations: Sequence[Any]) -> List[NormalizedConversation]:
    normalized: List[NormalizedConversation] = []
    for idx, raw in enumerate(raw_conversations):
        if not isinstance(raw, dict):
            continue
        conv_id = raw.get('id') or f'conversation-{idx}'
        title = raw.get('title') or 'Untitled conversation'
        created_at = ensure_seconds(raw.get('create_time'))
        updated_at = raw.get('update_time')
        updated_at = ensure_seconds(updated_at) if updated_at else None

        raw_messages: Iterable[Any]
        if raw.get('messages') and isinstance(raw['messages'], list):
            raw_messages = raw['messages']
        else:
            mapping = raw.get('mapping') or {}
            raw_messages = [entry.get('message') for entry in mapping.values() if isinstance(entry, dict) and entry.get('message')]

        messages: List[NormalizedMessage] = []
        for message_index, message in enumerate(raw_messages):
            if not isinstance(message, dict):
                continue
            text = extract_text(message)
            created = ensure_seconds(message.get('create_time') or created_at)
            msg = NormalizedMessage(
                id=message.get('id') or f'{conv_id}-message-{message_index}',
                conversation_id=conv_id,
                role=sanitize_role(((message.get('author') or {}).get('role'))),
                created_at=created,
                text=text,
                word_count=len(words(text))
            )
            messages.append(msg)

        normalized.append(
            NormalizedConversation(
                id=conv_id,
                title=title,
                created_at=created_at,
                updated_at=updated_at,
                messages=messages
            )
        )
    return normalized


@dataclass
class TopicDocument:
    conversation_id: str
    title: str
    tokens: List[str]
    word_count: int
    message_count: int
    sentiment: float
    week: str


@dataclass
class SparseVector:
    weights: Dict[int, float]


def score_sentiment(text: str) -> float:
    tokens = [token.lower() for token in words(text)]
    if not tokens:
        return 0.0
    score = sum(SENTIMENT_LEXICON.get(token, 0.0) for token in tokens)
    return max(-1.0, min(1.0, score / len(tokens)))


def compute_daily(conversations: Sequence[NormalizedConversation]) -> List[Dict[str, Any]]:
    buckets: Dict[str, Dict[str, float]] = defaultdict(lambda: {
        'messages': 0,
        'words': 0,
        'sentiment_total': 0.0,
        'sentiment_count': 0
    })
    for conversation in conversations:
        for message in conversation.messages:
            date = datetime.utcfromtimestamp(message.created_at).strftime('%Y-%m-%d')
            bucket = buckets[date]
            bucket['messages'] += 1
            bucket['words'] += message.word_count
            sentiment = score_sentiment(message.text)
            if sentiment:
                bucket['sentiment_total'] += sentiment
                bucket['sentiment_count'] += 1
    daily = []
    for date in sorted(buckets.keys()):
        stats = buckets[date]
        avg_sentiment = stats['sentiment_total'] / stats['sentiment_count'] if stats['sentiment_count'] else 0.0
        daily.append({
            'date': date,
            'messages': int(stats['messages']),
            'words': int(stats['words']),
            'sentiment': round(avg_sentiment, 3)
        })
    return daily


def compute_top_hour(conversations: Sequence[NormalizedConversation]) -> int:
    hours = Counter()
    for conversation in conversations:
        for message in conversation.messages:
            hour = datetime.utcfromtimestamp(message.created_at).hour
            hours[hour] += 1
    if not hours:
        return 0
    return hours.most_common(1)[0][0]


def compute_hour_histogram(conversations: Sequence[NormalizedConversation]) -> List[Dict[str, int]]:
    buckets = [{'hour': hour, 'messages': 0} for hour in range(24)]
    for conversation in conversations:
        for message in conversation.messages:
            hour = datetime.utcfromtimestamp(message.created_at).hour
            buckets[hour]['messages'] += 1
    return buckets


def compute_longest_streak(activity: Sequence[Dict[str, Any]]) -> int:
    if not activity:
        return 0
    dates = sorted({entry['date'] for entry in activity})
    best = current = 1
    for prev, curr in zip(dates, dates[1:]):
        prev_dt = datetime.strptime(prev, '%Y-%m-%d')
        curr_dt = datetime.strptime(curr, '%Y-%m-%d')
        if (curr_dt - prev_dt).days == 1:
            current += 1
            best = max(best, current)
        else:
            current = 1
    return best


def classify_mode(text: str) -> str:
    for mode, pattern in MODE_RULES:
        if pattern.search(text):
            return mode
    return 'chat' if len(text) < 280 else 'ask'


def compute_mode_breakdown(conversations: Sequence[NormalizedConversation]) -> List[Dict[str, float]]:
    counter = Counter()
    for conversation in conversations:
        for message in conversation.messages:
            counter[classify_mode(message.text)] += 1
    total = sum(counter.values()) or 1
    return [
        {'mode': mode, 'pct': count / total}
        for mode, count in counter.most_common()
    ]


def compute_top_keyword(conversations: Sequence[NormalizedConversation]) -> Dict[str, Any] | None:
    counts: Counter[str] = Counter()
    for conversation in conversations:
        for message in conversation.messages:
            for token in words(message.text.lower()):
                if len(token) < 3 or token in STOPWORDS:
                    continue
                counts[token] += 1
    if not counts:
        return None
    term, count = counts.most_common(1)[0]
    return {'term': term, 'count': count}


def filter_conversations_by_date(
    conversations: Sequence[NormalizedConversation], start: str | None, end: str | None
) -> List[NormalizedConversation]:
    if not start and not end:
        return list(conversations)

    start_date = datetime.fromisoformat(start).date() if start else None
    end_date = datetime.fromisoformat(end).date() if end else None

    filtered: List[NormalizedConversation] = []
    for conversation in conversations:
        messages: List[NormalizedMessage] = []
        for message in conversation.messages:
            msg_date = datetime.utcfromtimestamp(message.created_at).date()
            if start_date and msg_date < start_date:
                continue
            if end_date and msg_date > end_date:
                continue
            messages.append(message)
        if not messages:
            continue
        messages.sort(key=lambda msg: msg.created_at)
        filtered.append(
            NormalizedConversation(
                id=conversation.id,
                title=conversation.title,
                created_at=messages[0].created_at,
                updated_at=messages[-1].created_at,
                messages=messages
            )
        )
    return filtered


def iso_week_key(timestamp: int) -> str:
    dt = datetime.utcfromtimestamp(timestamp)
    return f"{dt.isocalendar().year}-{dt.isocalendar().week:02d}"


def compute_mode_series(conversations: Sequence[NormalizedConversation]) -> List[Dict[str, Any]]:
    series: Dict[str, Counter] = defaultdict(Counter)
    for conversation in conversations:
        for message in conversation.messages:
            week = iso_week_key(message.created_at)
            series[week][classify_mode(message.text)] += 1
    payload = []
    for week in sorted(series.keys()):
        breakdown = [{'mode': mode, 'messages': msg_count} for mode, msg_count in series[week].items()]
        payload.append({'week': week, 'breakdown': breakdown})
    return payload


def build_topic_documents(conversations: Sequence[NormalizedConversation]) -> List[TopicDocument]:
    documents: List[TopicDocument] = []
    for conversation in conversations:
        tokens: List[str] = []
        word_total = 0
        message_count = 0
        sentiment_total = 0.0
        first_timestamp: int | None = None
        for message in conversation.messages:
            cleaned = message.text.strip()
            if not cleaned:
                continue
            message_count += 1
            token_list = [token.lower() for token in words(cleaned)]
            filtered = [token for token in token_list if len(token) > 2 and token not in STOPWORDS]
            tokens.extend(filtered)
            word_total += len(filtered)
            sentiment_total += score_sentiment(cleaned)
            first_timestamp = message.created_at if first_timestamp is None else min(first_timestamp, message.created_at)
        if not tokens:
            continue
        avg_sentiment = sentiment_total / message_count if message_count else 0.0
        week_key = iso_week_key(first_timestamp or conversation.created_at)
        documents.append(
            TopicDocument(
                conversation_id=conversation.id,
                title=conversation.title,
                tokens=tokens,
                word_count=word_total,
                message_count=message_count,
                sentiment=avg_sentiment,
                week=week_key
            )
        )
    return documents


def build_vocabulary(documents: Sequence[TopicDocument], max_features: int = 1500, min_df: int = 2) -> Dict[str, int]:
    df: Counter[str] = Counter()
    for doc in documents:
        unique_tokens = set(doc.tokens)
        for token in unique_tokens:
            df[token] += 1
    vocab_candidates = [
        (token, freq)
        for token, freq in df.items()
        if freq >= min_df and len(token) > 2
    ]
    vocab_candidates.sort(key=lambda item: item[1], reverse=True)
    if len(vocab_candidates) > max_features:
        vocab_candidates = vocab_candidates[:max_features]
    return {token: idx for idx, (token, _) in enumerate(vocab_candidates)}


def build_vectors(documents: Sequence[TopicDocument], vocab: Dict[str, int]) -> List[SparseVector]:
    doc_count = len(documents)
    if not doc_count or not vocab:
        return [SparseVector({}) for _ in documents]
    df_counter: Counter[str] = Counter()
    for doc in documents:
        seen = set()
        for token in doc.tokens:
            if token in vocab and token not in seen:
                df_counter[token] += 1
                seen.add(token)
    idf = {token: math.log(1 + doc_count / (1 + df_counter[token])) for token in vocab}
    vectors: List[SparseVector] = []
    for doc in documents:
        counts = Counter(token for token in doc.tokens if token in vocab)
        total = sum(counts.values())
        if not total:
            vectors.append(SparseVector({}))
            continue
        weights: Dict[int, float] = {}
        for token, count in counts.items():
            idx = vocab[token]
            tfidf = (count / total) * idf[token]
            weights[idx] = tfidf
        norm = math.sqrt(sum(value * value for value in weights.values()))
        if norm:
            weights = {idx: value / norm for idx, value in weights.items()}
        vectors.append(SparseVector(weights))
    return vectors


def cosine_similarity(vector: SparseVector, centroid: Dict[int, float]) -> float:
    if not vector.weights or not centroid:
        return 0.0
    total = 0.0
    for idx, value in vector.weights.items():
        centroid_value = centroid.get(idx)
        if centroid_value is not None:
            total += value * centroid_value
    return total


def recompute_centroids(assignments: List[int], vectors: Sequence[SparseVector], k: int, rng: random.Random) -> List[Dict[int, float]]:
    totals: List[defaultdict[int, float]] = [defaultdict(float) for _ in range(k)]
    counts = [0] * k
    for assignment, vector in zip(assignments, vectors):
        counts[assignment] += 1
        for idx, value in vector.weights.items():
            totals[assignment][idx] += value
    centroids: List[Dict[int, float]] = []
    for idx in range(k):
        if not counts[idx]:
            random_index = rng.randrange(len(vectors))
            centroids.append(dict(vectors[random_index].weights))
            continue
        inv = 1.0 / counts[idx]
        centroid = {dim: total * inv for dim, total in totals[idx].items()}
        norm = math.sqrt(sum(value * value for value in centroid.values()))
        if norm:
            centroid = {dim: value / norm for dim, value in centroid.items()}
        centroids.append(centroid)
    return centroids


def run_kmeans(vectors: Sequence[SparseVector], k: int, max_iterations: int = 40) -> List[int]:
    if not vectors:
        return []
    k = max(1, min(k, len(vectors)))
    rng = random.Random(42)
    seeds = rng.sample(range(len(vectors)), k)
    centroids = [dict(vectors[idx].weights) for idx in seeds]
    assignments = [0] * len(vectors)
    for _ in range(max_iterations):
        changed = False
        for index, vector in enumerate(vectors):
            similarities = [cosine_similarity(vector, centroid) for centroid in centroids]
            if similarities:
                best_idx = similarities.index(max(similarities))
            else:
                best_idx = 0
            if assignments[index] != best_idx:
                assignments[index] = best_idx
                changed = True
        centroids = recompute_centroids(assignments, vectors, k, rng)
        if not changed:
            break
    return assignments


def sparse_vector_similarity(v1: SparseVector, v2: SparseVector) -> float:
    if not v1.weights or not v2.weights:
        return 0.0
    dot = 0.0
    for idx, val in v1.weights.items():
        if idx in v2.weights:
            dot += val * v2.weights[idx]
    return dot


def compute_silhouette_score(vectors: Sequence[SparseVector], assignments: List[int]) -> float:
    n = len(vectors)
    if n < 2:
        return 0.0
    
    cluster_indices: Dict[int, List[int]] = defaultdict(list)
    for i, cluster_id in enumerate(assignments):
        cluster_indices[cluster_id].append(i)
    
    num_clusters = len(cluster_indices)
    if num_clusters < 2:
        return 0.0
    
    silhouette_sum = 0.0
    valid_count = 0
    
    for i in range(n):
        my_cluster = assignments[i]
        my_cluster_members = cluster_indices[my_cluster]
        
        if len(my_cluster_members) <= 1:
            continue
        
        a_sum = 0.0
        for j in my_cluster_members:
            if i != j:
                sim = sparse_vector_similarity(vectors[i], vectors[j])
                a_sum += (1.0 - sim)
        a = a_sum / (len(my_cluster_members) - 1)
        
        b = float('inf')
        for other_cluster, members in cluster_indices.items():
            if other_cluster == my_cluster:
                continue
            if not members:
                continue
            b_sum = 0.0
            for j in members:
                sim = sparse_vector_similarity(vectors[i], vectors[j])
                b_sum += (1.0 - sim)
            avg_dist = b_sum / len(members)
            if avg_dist < b:
                b = avg_dist
        
        if b == float('inf'):
            continue
        
        denom = max(a, b)
        if denom > 0:
            s = (b - a) / denom
            silhouette_sum += s
            valid_count += 1
    
    if valid_count == 0:
        return 0.0
    return silhouette_sum / valid_count


def find_optimal_cluster_count(vectors: Sequence[SparseVector], min_k: int = 2, max_k: int = 12) -> int:
    n = len(vectors)
    if n <= 2:
        return max(1, n)
    
    max_k = min(max_k, n - 1)
    min_k = max(2, min_k)
    
    if min_k > max_k:
        return min_k
    
    best_k = min_k
    best_score = -1.0
    
    for k in range(min_k, max_k + 1):
        assignments = run_kmeans(vectors, k)
        
        actual_clusters = len(set(assignments))
        if actual_clusters < 2:
            continue
        
        score = compute_silhouette_score(vectors, assignments)
        
        if score > best_score:
            best_score = score
            best_k = k
    
    return best_k


def extract_keywords(doc_indices: Sequence[int], documents: Sequence[TopicDocument], limit: int = 5) -> List[str]:
    counter: Counter[str] = Counter()
    for index in doc_indices:
        counter.update(documents[index].tokens)
    keywords: List[str] = []
    for term, _ in counter.most_common(limit * 2):
        if term in keywords:
            continue
        keywords.append(term)
        if len(keywords) >= limit:
            break
    return keywords


def format_topic_label(keywords: Sequence[str]) -> str:
    if not keywords:
        return 'General'
    if len(keywords) == 1:
        return keywords[0].title()
    primary = keywords[0].title()
    secondary = keywords[1].title()
    return f'{primary} & {secondary}'


def generate_ai_labels(
    client: Any,
    cluster_titles: List[List[str]]
) -> List[Dict[str, str]]:
    labels: List[Dict[str, str]] = []
    
    for titles in cluster_titles:
        sample_titles = titles[:20]
        titles_text = '\n- '.join(sample_titles)
        
        try:
            response = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {
                        'role': 'system',
                        'content': '''You analyze conversation titles from a ChatGPT history export and create meaningful topic labels.

Your task: Look at the conversation titles and identify the MAIN THEME or SUBJECT AREA they share.

Rules for labels:
- Be SPECIFIC and DESCRIPTIVE (e.g., "React Development", "Python Debugging", "Creative Writing", "Career Advice")
- Focus on the actual subject matter, not generic words
- Use 2-4 words that a human would understand
- If conversations are about coding, specify the language/framework (e.g., "TypeScript APIs" not just "Code")
- If about a specific domain, name it (e.g., "Machine Learning", "Web Design", "Business Strategy")

Respond in JSON: {"label": "...", "description": "..."}'''
                    },
                    {
                        'role': 'user',
                        'content': f'''Here are conversation titles from one semantic cluster. What topic/theme do they share?

Conversation titles:
- {titles_text}

Generate a specific, meaningful label and brief description.'''
                    }
                ],
                response_format={'type': 'json_object'},
                temperature=0.5,
                max_tokens=150
            )
            
            content = response.choices[0].message.content or '{}'
            parsed = json.loads(content)
            labels.append({
                'label': parsed.get('label', f'Topic {len(labels) + 1}'),
                'description': parsed.get('description', 'A cluster of related conversations.')
            })
        except Exception:
            labels.append({
                'label': f'Topic {len(labels) + 1}',
                'description': 'A cluster of related conversations.'
            })
    
    return labels


def estimate_topics(
    conversations: Sequence[NormalizedConversation],
    openai_client: Optional[Any] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, str]]:
    documents = build_topic_documents(conversations)
    if not documents:
        return [], [], {}
    vocab = build_vocabulary(documents)
    vectors = build_vectors(documents, vocab)
    populated_vectors = any(vector.weights for vector in vectors)
    
    if not populated_vectors:
        cluster_count = 1
        assignments = [0] * len(documents)
    else:
        print("Finding optimal number of topics using silhouette analysis...")
        cluster_count = find_optimal_cluster_count(vectors, min_k=2, max_k=12)
        print(f"Optimal topic count: {cluster_count}")
        assignments = run_kmeans(vectors, cluster_count)
    
    clusters: Dict[int, List[int]] = defaultdict(list)
    series_buckets: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
    for doc_index, cluster_index in enumerate(assignments):
        key = cluster_index if populated_vectors else 0
        clusters[key].append(doc_index)
        bucket = series_buckets[documents[doc_index].week]
        bucket[key] = bucket.get(key, 0) + documents[doc_index].word_count
    
    cluster_titles: List[List[str]] = []
    cluster_order = sorted(clusters.keys())
    for cluster_index in cluster_order:
        doc_indices = clusters[cluster_index]
        titles = [documents[idx].title for idx in doc_indices]
        cluster_titles.append(titles)
    
    ai_labels: List[Dict[str, str]] = []
    if openai_client is not None:
        print("Generating topic labels with AI...")
        ai_labels = generate_ai_labels(openai_client, cluster_titles)
    
    palette_size = len(TOPIC_COLOR_POOL)
    topics: List[Dict[str, Any]] = []
    cluster_meta: Dict[int, Dict[str, Any]] = {}
    for order_idx, cluster_index in enumerate(cluster_order):
        doc_indices = clusters[cluster_index]
        if not doc_indices:
            continue
        keywords = extract_keywords(doc_indices, documents)
        
        if ai_labels and order_idx < len(ai_labels):
            label = ai_labels[order_idx]['label']
        else:
            label = format_topic_label(keywords)
        
        word_count = sum(documents[idx].word_count for idx in doc_indices)
        message_count = sum(documents[idx].message_count for idx in doc_indices)
        sentiment_total = sum(documents[idx].sentiment * documents[idx].message_count for idx in doc_indices)
        sentiment = sentiment_total / message_count if message_count else 0.0
        topic_payload = {
            'topic_id': f'cluster-{cluster_index}',
            'label': label,
            'size': word_count,
            'color': TOPIC_COLOR_POOL[cluster_index % palette_size],
            'sentiment': round(sentiment, 3),
            'messages': message_count
        }
        if keywords:
            topic_payload['keywords'] = keywords[:5]
        topics.append(topic_payload)
        cluster_meta[cluster_index] = topic_payload
    topics.sort(key=lambda entry: entry['size'], reverse=True)

    topic_series: List[Dict[str, Any]] = []
    for week in sorted(series_buckets.keys()):
        breakdown_map = series_buckets[week]
        total = sum(breakdown_map.values()) or 1
        breakdown: List[Dict[str, Any]] = []
        for cluster_index, word_count in sorted(breakdown_map.items(), key=lambda item: item[1], reverse=True):
            topic = cluster_meta.get(cluster_index)
            if not topic:
                continue
            breakdown.append({
                'topic_id': topic['topic_id'],
                'label': topic['label'],
                'share': word_count / total
            })
        if breakdown:
            topic_series.append({'week': week, 'breakdown': breakdown})

    mapping: Dict[str, str] = {}
    for doc_index, cluster_index in enumerate(assignments):
        key = cluster_index if populated_vectors else 0
        topic = cluster_meta.get(key)
        if topic:
            mapping[documents[doc_index].conversation_id] = topic['topic_id']

    return topics, topic_series, mapping


def build_conversation_summaries(conversations: Sequence[NormalizedConversation], mapping: Dict[str, str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    items = []
    for conversation in conversations:
        summary = {
            'conversation_id': conversation.id,
            'title': conversation.title,
            'messages': len(conversation.messages),
            'start': datetime.utcfromtimestamp(conversation.created_at).strftime('%Y-%m-%d')
        }
        if mapping and conversation.id in mapping:
            summary['topic_id'] = mapping[conversation.id]
        items.append(summary)
    items.sort(key=lambda entry: entry['messages'], reverse=True)
    return items[:limit]


def compute_totals(conversations: Sequence[NormalizedConversation]) -> Dict[str, int]:
    stats = {
        'messages': 0,
        'words': 0,
        'user_words': 0,
        'assistant_words': 0
    }
    for conversation in conversations:
        for message in conversation.messages:
            stats['messages'] += 1
            stats['words'] += message.word_count
            if message.role == 'user':
                stats['user_words'] += message.word_count
            elif message.role == 'assistant':
                stats['assistant_words'] += message.word_count
    return stats


def compute_summary(
    conversations: Sequence[NormalizedConversation],
    openai_client: Optional[Any] = None
) -> Dict[str, Any]:
    activity = compute_daily(conversations)
    totals = compute_totals(conversations)
    top_hour = compute_top_hour(conversations)
    streak = compute_longest_streak(activity)
    topics, topic_series, mapping = estimate_topics(conversations, openai_client)
    modes = compute_mode_breakdown(conversations)
    start = activity[0]['date'] if activity else datetime.now(tz=timezone.utc).strftime('%Y-%m-%d')
    end = activity[-1]['date'] if activity else start
    start_dt = datetime.strptime(start, '%Y-%m-%d')
    end_dt = datetime.strptime(end, '%Y-%m-%d')
    period_days = max(1, (end_dt - start_dt).days + 1)
    active_days = len(activity)
    top_keyword = compute_top_keyword(conversations)
    fun = {
        'novel_pages': round(totals['words'] / 250) if totals['words'] else 0,
        'avg_words_per_day': round(totals['words'] / active_days) if active_days else 0,
        'top_keyword': top_keyword,
        'active_days': active_days,
        'period_days': period_days,
        'user_words_pct': (totals['user_words'] / totals['words']) if totals['words'] else 0,
        'assistant_words_pct': (totals['assistant_words'] / totals['words']) if totals['words'] else 0
    }
    return {
        'summary': {
            'period': {'start': start, 'end': end},
            'totals': totals,
            'most_active_hour': top_hour,
            'longest_streak_days': streak,
            'top_topics': [
                {
                    'label': topic['label'],
                    'pct': (topic['size'] / totals['words']) if totals['words'] else 0
                }
                for topic in topics[:3]
            ],
            'modes': modes,
            'fun': fun
        },
        'activity': activity,
        'topics': topics,
        'topicSeries': topic_series,
        'conversations': build_conversation_summaries(conversations, mapping),
        'hours': compute_hour_histogram(conversations),
        'modeSeries': compute_mode_series(conversations)
    }


def iter_export_conversations(export_path: Path) -> Iterable[Any]:
    def yield_payload(payload: Any) -> Iterable[Any]:
        if isinstance(payload, list):
            yield from payload
        elif isinstance(payload, dict) and isinstance(payload.get('conversations'), list):
            yield from payload['conversations']
        else:
            yield payload

    if export_path.is_file():
        if export_path.suffix == '.zip':
            with zipfile.ZipFile(export_path) as archive:
                for info in archive.infolist():
                    if info.is_dir():
                        continue
                    if not (info.filename.endswith('conversations.json') or 'conversations/' in info.filename):
                        continue
                    with archive.open(info) as handle:
                        try:
                            data = json.load(handle)
                        except json.JSONDecodeError:
                            continue
                        yield from yield_payload(data)
            return

        try:
            raw_text = export_path.read_text()
            payload = json.loads(raw_text)
        except (OSError, json.JSONDecodeError) as exc:
            raise FileNotFoundError(f'Could not read conversations from: {export_path}') from exc
        yield from yield_payload(payload)
        return

    if export_path.is_dir():
        candidates = list(export_path.glob('**/conversations*.json'))
        for path in candidates:
            try:
                payload = json.loads(path.read_text())
            except json.JSONDecodeError:
                continue
            yield from yield_payload(payload)
        return

    raise FileNotFoundError(f'Could not read conversations from: {export_path}')


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as handle:
        json.dump(payload, handle, indent=2)


def run_etl(
    export_path: Path,
    output_dir: Path,
    start: str | None,
    end: str | None,
    openai_key: str | None = None
) -> None:
    openai_client = None
    api_key = openai_key or os.environ.get('OPENAI_API_KEY')
    
    if api_key and OPENAI_AVAILABLE:
        openai_client = OpenAI(api_key=api_key)
        print("OpenAI API key found - will generate AI-powered topic labels")
    elif api_key and not OPENAI_AVAILABLE:
        print("Warning: OpenAI API key provided but 'openai' package not installed. Run: pip install openai")
    else:
        print("No OpenAI API key - using fallback topic labels (set OPENAI_API_KEY or use --openai-key)")
    
    raw_conversations = list(iter_export_conversations(export_path))
    if not raw_conversations:
        raise RuntimeError('No conversations found. Did you pass the correct export path?')
    normalized = normalize_conversations(raw_conversations)
    normalized = filter_conversations_by_date(normalized, start, end)
    if not normalized:
        raise RuntimeError('Date filter excluded all conversations. Adjust --start-date/--end-date.')
    results = compute_summary(normalized, openai_client)

    write_json(output_dir / 'summary.json', results['summary'])
    write_json(output_dir / 'activity_timeseries.json', results['activity'])
    write_json(output_dir / 'topics.json', results['topics'])
    write_json(output_dir / 'topic_series.json', results['topicSeries'])
    write_json(output_dir / 'messages_sample.json', results['conversations'])
    write_json(output_dir / 'hour_histogram.json', results['hours'])
    write_json(output_dir / 'mode_series.json', results['modeSeries'])

    print(f"Wrote datasets to {output_dir}")


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='ChatGPT Wrapped ETL tool')
    parser.add_argument('--export', required=True, help='Path to ChatGPT export folder or ZIP archive')
    parser.add_argument('--out', default='apps/web/public/data', help='Directory for generated JSON files')
    parser.add_argument('--start-date', help='Optional inclusive start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', help='Optional inclusive end date (YYYY-MM-DD)')
    parser.add_argument('--openai-key', help='OpenAI API key for AI-powered topic labels (or set OPENAI_API_KEY env var)')
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> None:
    args = parse_args(argv or sys.argv[1:])
    export_path = Path(args.export).expanduser().resolve()
    output_dir = Path(args.out).expanduser().resolve()
    run_etl(export_path, output_dir, args.start_date, args.end_date, args.openai_key)


if __name__ == '__main__':
    main()
