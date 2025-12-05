# GPT Wrapped - Story Data Requirements

This document outlines the data requirements for each slide in the "2025 Wrapped" story experience.

## 1. Intro: Total Questions

- **Title**: "You asked ChatGPT [N] questions... when you probably could have just thought about it for a second."
- **Data Required**: `totals.messages` (number)
- **Source**: Count of all user messages across all conversations.
- **Logic**: Simple aggregation of message count where `role === 'user'`.

## 2. Top Topics: What You Wouldn't Stop Talking About

- **Title**: "What you wouldn't stop talking about"
- **Data Required**: `summary.top_topics` (Array of objects)
  - `label` (string): Name of the topic - **single keyword, capitalized** (e.g., "Coding", "Design", "Writing").
  - `pct` (number): Percentage of total conversation volume this topic represents (0.0 to 1.0).
- **Source**: Topic modeling (clustering) performed on conversation content.
- **Logic**:
  1.  Extract text from all conversations.
  2.  Tokenize and build TF-IDF vectors.
  3.  Cluster vectors (K-Means) to identify topics.
  4.  Label clusters using the **top keyword only** (single word, capitalized).
  5.  Calculate the size (word count) of each cluster relative to the total word count.

## 3. Vocabulary: Your Top Words

- **Title**: "Your Vocabulary"
- **Data Required**: `summary.fun.top_words` (Array of objects, top 5)
  - `term` (string): The word itself.
  - `count` (number): How many times it was used.
- **Source**: Frequency analysis of user messages.
- **Logic**:
  1.  Tokenize all user messages.
  2.  Filter out an extensive list of English stopwords (e.g., "the", "and", "is", "what", "how").
  3.  Count occurrences of each remaining token.
  4.  Sort by frequency descending and take the top 5.

## 4. Stupid Questions

- **Title**: "You asked [N] Stupid Questions" (Top 0.001% roast)
- **Data Required**: `summary.fun.stupid_question_count` (number)
- **Source**: Heuristic analysis of user queries.
- **Logic**:
  - Iterate through all user messages.
  - Identify a message as "stupid" if:
    1.  It is very short (<= 5 words).
    2.  It starts with a basic question word ("how", "what", "why", "is", "can").
  - **Only 5% of qualifying messages are counted** to keep the number interesting rather than overwhelming.
  - _Note: This is a playful heuristic, not an actual measure of intelligence._

## 5. Weirdest Request

- **Title**: "Your Weirdest Request"
- **Data Required**: `summary.fun.weirdest_request` (string)
- **Source**: Heuristic analysis for outlier messages.
- **Logic**:
  - **Primary Heuristic**: Search for user messages containing keywords like "weird", "strange", "odd", "bizarre", "crazy", "funny", "random". This captures intent like "tell me a weird fact" or "generate a random story".
  - **Fallback Heuristic**: If no explicit matches are found, find the message containing the **longest single word** (indicating jargon or gibberish).
  - The text is truncated to 150 characters for display.

## 6. Validation: You Were Right

- **Title**: "But hey, you were right! [N] Times!"
- **Data Required**: `summary.fun.right_count` (number)
- **Source**: Pattern matching on assistant responses.
- **Logic**:
  - Iterate through all **assistant** messages.
  - Check if the text contains validation phrases such as:
    - "you are right"
    - "you're correct"
    - "good point"
    - "that's correct"
    - "you are absolutely right"
  - Count the number of matches.
