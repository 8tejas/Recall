import httpx
import json

client = httpx.Client(base_url="http://127.0.0.1:8000/api", timeout=30.0)

# 1. Parse Syllabus
raw_syl = """Operating Systems (CS-301)
Unit 1: Process Management & CPU Scheduling
Process Control Block, Context Switching, Preemptive and Non-Preemptive Scheduling, Round Robin, Multilevel Feedback Queues
Unit 2: Concurrency & Synchronization
Critical Section Problem, Peterson Solution, Semaphores, Mutex Locks, Deadlock Characterization, Banker Algorithm
Unit 3: Memory Hierarchy & Virtual Memory
Paging, Segmentation, Demand Paging, Page Fault Handling, Page Replacement Algorithms (FIFO, LRU, Optimal)"""

print("1. Testing Syllabus Parsing...")
parse_res = client.post("/subjects/parse-syllabus", json={"raw_syllabus": raw_syl})
assert parse_res.status_code == 200, f"Parse failed: {parse_res.text}"
parsed = parse_res.json()
print(f"   Success! Subject: {parsed['subject_name']}, Units: {len(parsed['units'])}")
assert len(parsed["units"]) == 3

# 2. Create Subject & Save Hierarchy
print("2. Testing Subject Creation & Syllabus Hierarchy Application...")
create_res = client.post("/subjects", json={"name": parsed["subject_name"], "code": "CS-301"})
assert create_res.status_code == 200
subject_id = create_res.json()["id"]

apply_res = client.post(f"/subjects/{subject_id}/syllabus", json=parsed)
assert apply_res.status_code == 200
detail = apply_res.json()
print(f"   Subject ID: {subject_id}, Total Units Saved: {len(detail['units'])}")

# 3. Pick first topic
first_unit = detail["units"][0]
first_topic = first_unit["topics"][0]
topic_id = first_topic["id"]
print(f"3. Selected Topic for Workspace Testing: '{first_topic['title']}' (ID: {topic_id})")

# 4. Generate Study Notes
print("4. Generating Comprehensive Study Notes...")
gen_notes = client.post(f"/topics/{topic_id}/generate", json={"resource_type": "comprehensive_notes"})
assert gen_notes.status_code == 200
mats_res = client.get(f"/topics/{topic_id}/materials")
assert mats_res.status_code == 200 and len(mats_res.json()) >= 1
mat_title = mats_res.json()[0]["title"]
print(f"   Notes successfully stored! Title: '{mat_title}'")

# 5. Generate Memorization Exercises
print("5. Generating Memorization Engine Exercises...")
gen_mem = client.post(f"/topics/{topic_id}/generate", json={"resource_type": "memorization_exercises"})
assert gen_mem.status_code == 200
exs_res = client.get(f"/topics/{topic_id}/exercises")
assert exs_res.status_code == 200 and len(exs_res.json()) >= 3
exs = exs_res.json()
print(f"   Memorization exercises generated: {len(exs)}")
modes = [e["exercise_mode"] for e in exs]
print(f"   Generated Cognitive Modes: {modes}")

# 6. Test Progressive Cloze Deletion Attempt
prog_ex = next(e for e in exs if e["exercise_mode"] == "progressive_deletion")
att_res = client.post(f"/exercises/{prog_ex['id']}/attempt", json={
    "submission_text": "Process Control Block is an academic data structure",
    "performance_rating": "completely_remembered",
    "level_completed": 4,
    "score": 1.0
})
assert att_res.status_code == 200
print("   Progressive Deletion attempt logged and scheduled in FSRS!")

# 7. Test Paragraph Reconstruction Evaluation
para_ex = next(e for e in exs if e["exercise_mode"] == "paragraph_reconstruction")
eval_res = client.post(f"/exercises/{para_ex['id']}/evaluate", json={
    "submission_text": "The architecture of Process Control Block relies upon core components: input validation interface and primary transformation pipeline to preserve data integrity and bounded performance."
})
assert eval_res.status_code == 200
diff_data = eval_res.json()
print(f"   Paragraph Diff Fidelity Score: {diff_data.get('score')}, Matched Keywords: {len(diff_data.get('matched_keywords', []))}")

# 8. Generate Written Exam Questions
print("8. Generating Written Exam Questions (2m, 5m, 10m)...")
gen_qs = client.post(f"/topics/{topic_id}/generate", json={"resource_type": "written_questions"})
assert gen_qs.status_code == 200
qs_res = client.get(f"/topics/{topic_id}/questions")
assert qs_res.status_code == 200 and len(qs_res.json()) >= 2
questions = qs_res.json()
print(f"   Questions generated: {len(questions)} (Marks: {[q['mark_category'] for q in questions]})")

# 9. Test AI Written Evaluation
five_mark_q = next(q for q in questions if q["mark_category"] == 5)
q_eval = client.post(f"/questions/{five_mark_q['id']}/submit", json={
    "submission_text": "Process Control Block operates by maintaining execution state across sequential stages. Key components include input validation, transformation mechanism, and output synthesis. It guarantees determinism and bounded complexity in asymptotic limits."
})
assert q_eval.status_code == 200
ans_report = q_eval.json()
print(f"   AI Examiner Marks Awarded: {ans_report['estimated_marks']} / {ans_report['maximum_marks']}")
print(f"   Examiner Feedback: {ans_report.get('terminology_assessment')}")

# 10. Test Spaced Repetition Queue & Dashboard Stats
print("10. Testing Spaced Repetition Queue & Dashboard Stats...")
rev_res = client.get("/revision/due")
assert rev_res.status_code == 200
due_items = rev_res.json()
print(f"    Scheduled revision items: {len(due_items)}")

stats_res = client.get("/dashboard/stats")
assert stats_res.status_code == 200
dash = stats_res.json()
print(f"    Dashboard Stats: Total Subjects: {dash['total_subjects']}, Total Topics: {dash['total_topics']}, Mastered: {dash['mastered_topics']}")

print("\nALL 10 END-TO-END INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
