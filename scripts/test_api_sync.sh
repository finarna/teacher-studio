#!/bin/bash
curl -s "http://localhost:9001/api/tests/official?subject=Mathematics&examContext=KCET" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"Success: {data.get('success')}\")
print(f\"Test count: {len(data.get('data', []))}\")
print()
for i, test in enumerate(data.get('data', []), 1):
    print(f\"{i}. {test.get('test_name', test.get('testName'))}\")
    print(f\"   Subject: {test.get('subject')}\")
    print(f\"   Set ID: {test.get('official_set_id')}\")
    print(f\"   Virtual: {test.get('is_virtual')}\")
    print()
"
