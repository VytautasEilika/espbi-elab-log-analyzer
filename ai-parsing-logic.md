# Log Parsing Logic Specification

This document details the regex patterns and logic used to parse the application logs. It allows for the extraction of this logic into a shared library for use in both the Web UI and matching CLI tools.

## 1. Top-Level Entry Parsing
**Goal**: Split a raw log file into distinct `LogEntry` objects.

-   **Entry Delimiter**: A line starting with a timestamp.
-   **Regex**: `^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]`
-   **Logic**:
    -   Iterate through lines.
    -   If a line matches the timestamp regex, it starts a new entry.
    -   All subsequent lines that do *not* match the timestamp regex are appended to the current entry's content (handling multi-line stack traces or JSON dumps).

### Extracted Fields per Entry
Once an entry is isolated, the following fields are extracted from the first line (or full content):

| Field | Regex / Logic | Example |
| :--- | :--- | :--- |
| **Timestamp** | `^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]` (Capture Group 1) | `2026-01-05 14:19:34` |
| **Environment** | `\]\s+(\w+)\.(ERROR\|WARN\|INFO\|DEBUG):` (Capture Group 1) | `production` |
| **Level** | `\]\s+(\w+)\.(ERROR\|WARN\|INFO\|DEBUG):` (Capture Group 2) <br> *Fallback*: Check for `ERROR`, `WARN`, `INFO` string presence. | `INFO` |
| **Request ID** | `REQ-[a-zA-Z0-9]+` | `REQ-695bac56b1d7a` |

## 2. Request Grouping
**Goal**: Group `LogEntry` objects by `requestId`.

-   **Key**: `requestId` extracted above.
-   **Logic**:
    -   Map<RequestId, LogEntry[]>
    -   Entries without a `requestId` are effectively orphaned or global (often ignored in Request View).
-   **Computed Group Fields**:
    -   `startTime`: Timestamp of the first entry.
    -   `endTime`: Timestamp of the last entry.
    -   `durationMs`: `endTime - startTime`.
    -   `hasErrors`: True if any entry has Level `ERROR`.
    -   `hasWarnings`: True if any entry has Level `WARN`.
    -   `url`: Extracted from specific entry (see below).

## 3. Deep Content Inspection
**Goal**: Identify specific actions or data within the parsed content.
*Note: These regexes are applied to the "cleaned" content (stripping timestamp, env, req-id).*

### A. HTTP Traffic
| Type | Regex | Description |
| :--- | :--- | :--- |
| **Incoming Request (URL)** | `^>>>\s+(POST\|GET\|PUT\|DELETE\|PATCH)\s+(\S+)\s+(.*)` | Captures Method, URL, and additional context. Used to populate the `url` field of a Request Group. |
| **Outgoing Request** | `^doRequest:\s+(POST\|GET\|PUT\|DELETE\|PATCH)\s+(\w+)\s+(.*)` | Captures Method, Target Service/Type, and details. |
| **Response Status** | `^<<<\s+(\d+)\s+(.*)` | Captures Status Code and Body/Context. Status >= 400 marks the request as failed. |
| **Response Headers** | `^Response Headers:\s+(.*)` | Captures JSON-formatted headers. |
| **Request Headers** | `^Request headers:\s+(.*)` | Captures JSON-formatted headers. |

### B. Caching & Session
| Type | Regex |
| :--- | :--- |
| **Cache Hit/Lookup** | `^(getResourceFromCache\|getResourceFromSession):\s+(.+)` |
| **Save to Session** | `^saveResourceToSession:\s+(.+)` |
| **Save to Cache** | `^saveResourceToCache:\s+(.+)` |
| **Cache Miss** | `^Cache not found` |

### C. Data Payload
| Type | Regex |
| :--- | :--- |
| **JSON Body** | `^(\{[\s\S]*\|\[[\s\S]*)` (Starts with `{` or `[`) |
| **XML Body** | `^Response:\s*(<\?xml[\s\S]*)` or `^request:\s*(<\?xml[\s\S]*)` |

## 4. Metadata Cleaning
For display purposes, logs are often "cleaned" of their standard prefix to avoid visual noise.
-   **Remove Timestamp**: `^\[?\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]?\s*`
-   **Remove Env/Level**: `^\w+\.(ERROR\|WARN\|INFO\|DEBUG):\s*`
-   **Remove Request ID**: `^REQ-[a-zA-Z0-9]+\s*`
