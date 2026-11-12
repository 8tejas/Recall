import asyncio
from backend.app.services.ai_provider import get_ai_provider, STUDY_NOTES_SYSTEM_PROMPT

async def test_groq_exact():
    ai = get_ai_provider()
    unit_topics_str = 'Basics of Big Data, Hadoop Architecture, HDFS, MapReduce'
    prompt = f"""Generate university-standard academic study material for the target topic: 'Basics of Big Data: Introduction to Big Data'.

CURRICULUM HIERARCHY CONTEXT:
- Subject: 'Big Data Analytics'
- Unit: '[9Hrs]'
- Unit Description/Scope: 'Standard syllabus module'
- Complete Topics Roadmap in this Unit: [{unit_topics_str}]

GENERATION PARAMETERS:
- Resource Type: 'comprehensive_notes'.
- Focus deeply and authoritatively on 'Basics of Big Data: Introduction to Big Data'.
- Coherence Rule: Leverage the surrounding unit topics roadmap above to frame prerequisite principles and ensure technical consistency with the rest of the unit, without repeating entire explanations of sibling topics.
- Custom Examiner Focus: 'Standard university examination standard'.

Return JSON adhering strictly to schema:
{{"title": str, "markdown_text": str, "content_json": {{"core_points": [str], "key_terms": [str]}}}}
"""
    try:
        res = await ai._call_groq_json([
            {'role': 'system', 'content': STUDY_NOTES_SYSTEM_PROMPT + '\nYou must respond with valid JSON.'},
            {'role': 'user', 'content': prompt}
        ])
        print('Groq keys returned:', list(res.keys()))
        print('Title:', res.get('title'))
        print('Markdown length:', len(res.get('markdown_text', '')))
        print('Sample markdown:\n', res.get('markdown_text', '')[:300])
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test_groq_exact())

