import re
import difflib
from typing import List, Dict, Any, Optional

# Standard academic stop words to preserve when generating clozes
STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by",
    "from", "up", "about", "into", "over", "after", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "can", "could", "shall",
    "should", "will", "would", "may", "might", "must", "it", "its", "they", "them",
    "their", "this", "that", "these", "those", "of", "as", "such", "than", "so", "very"
}

class MemorizationEngine:
    """
    Deterministic cognitive memorization engine for academic definitions,
    theorems, formulas, and structured explanations.
    """

    @staticmethod
    def extract_keywords(text: str, max_keywords: int = 8) -> List[str]:
        """Extract significant technical nouns, verbs, and domain terms."""
        # Find clean tokens
        tokens = re.findall(r"\b[A-Za-z0-9_-]{3,}\b", text)
        candidates = []
        for t in tokens:
            low = t.lower()
            if low not in STOP_WORDS and not low.isdigit():
                candidates.append(t)
        
        # Rank by uniqueness and length / occurrence
        freq: Dict[str, int] = {}
        ordered_unique: List[str] = []
        for c in candidates:
            k = c.lower()
            if k not in freq:
                freq[k] = 1
                ordered_unique.append(c)
            else:
                freq[k] += 1
        
        # Sort by significance (length + capitalized bonus)
        scored = sorted(
            ordered_unique,
            key=lambda w: (freq[w.lower()] * 2 + len(w) + (3 if w[0].isupper() else 0)),
            reverse=True
        )
        return scored[:max_keywords]

    @classmethod
    def generate_progressive_deletion(cls, text: str, term: str = "") -> Dict[str, Any]:
        """
        Mode A: Progressive Sentence Deletion.
        Level 1: Original text for initial study.
        Level 2: Cloze deletion (25-40% key content words replaced with blanks).
        Level 3: Essential technical keywords only (scaffolding).
        Level 4: Blank reproduction from heading/term.
        """
        words = re.findall(r"\S+|\s+", text)
        clean_words = [w for w in re.split(r"(\s+)", text) if w.strip()]
        
        # Identify words eligible for cloze deletion
        candidate_indices = []
        for idx, word in enumerate(clean_words):
            stripped = re.sub(r"[^\w-]", "", word)
            if stripped.lower() not in STOP_WORDS and len(stripped) >= 4:
                candidate_indices.append((idx, stripped))
        
        # Select roughly every 2nd or 3rd candidate word (targeting ~30% of content words)
        cloze_targets = set()
        for i, (idx, candidate) in enumerate(candidate_indices):
            if i % 2 == 1 or i % 3 == 0:
                cloze_targets.add(idx)

        # Build Level 2 masked text and tokens
        masked_tokens = []
        cloze_counter = 1
        level2_parts = []

        for idx, word in enumerate(clean_words):
            stripped = re.sub(r"[^\w-]", "", word)
            punctuation = word[len(stripped):] if word.startswith(stripped) else ""
            
            if idx in cloze_targets:
                blank = "______" + punctuation
                level2_parts.append(blank)
                masked_tokens.append({
                    "index": idx,
                    "text": stripped,
                    "is_cloze": True,
                    "cloze_index": cloze_counter,
                    "hint": f"{stripped[0]}... ({len(stripped)} letters)"
                })
                cloze_counter += 1
            else:
                level2_parts.append(word)
                masked_tokens.append({
                    "index": idx,
                    "text": word,
                    "is_cloze": False,
                    "cloze_index": None,
                    "hint": None
                })

        level2_masked_text = " ".join(level2_parts)
        level3_keywords = cls.extract_keywords(text, max_keywords=7)
        prompt_title = term if term else (text[:50] + "..." if len(text) > 50 else text)

        return {
            "original_text": text,
            "source_term": term,
            "level1_text": text,
            "level2_masked_text": level2_masked_text,
            "level2_cloze_tokens": masked_tokens,
            "level3_keywords": level3_keywords,
            "level4_prompt": f"Define and fully reproduce the explanation for: {prompt_title}"
        }

    @classmethod
    def evaluate_paragraph_reconstruction(
        cls, reference_text: str, student_submission: str
    ) -> Dict[str, Any]:
        """
        Mode B: Paragraph Reconstruction comparison.
        Compares student's paragraph with reference, highlighting missing concepts
        and semantically matched segments.
        """
        ref_clean = reference_text.strip()
        sub_clean = student_submission.strip()

        # Keyword overlap
        ref_keywords = cls.extract_keywords(ref_clean, max_keywords=12)
        sub_tokens_lower = set(re.findall(r"\b[A-Za-z0-9_-]+\b", sub_clean.lower()))

        matched_keywords = []
        missing_keywords = []
        for kw in ref_keywords:
            if kw.lower() in sub_tokens_lower:
                matched_keywords.append(kw)
            else:
                missing_keywords.append(kw)

        # Sequence matcher for structural similarity
        matcher = difflib.SequenceMatcher(None, ref_clean.lower(), sub_clean.lower())
        similarity_ratio = round(matcher.ratio(), 3)

        # Keyword coverage ratio
        kw_coverage = round(len(matched_keywords) / max(1, len(ref_keywords)), 3)

        # Blended academic score (0.0 to 1.0)
        # We value semantic keyword coverage (70%) more than verbatim character matching (30%)
        blended_score = round((kw_coverage * 0.7) + (similarity_ratio * 0.3), 3)

        # Generate constructive feedback
        if blended_score >= 0.85:
            assessment = "Excellent reconstruction. High factual fidelity and technical vocabulary."
        elif blended_score >= 0.65:
            assessment = "Good recall of core concept, but missed key technical terminology."
        elif blended_score >= 0.40:
            assessment = "Partial recall. Major omissions detected in critical components."
        else:
            assessment = "Substantial gaps. Review the original text and practice cloze deletion."

        return {
            "score": blended_score,
            "similarity_ratio": similarity_ratio,
            "keyword_coverage": kw_coverage,
            "matched_keywords": matched_keywords,
            "missing_keywords": missing_keywords,
            "assessment": assessment,
            "reference_text": reference_text,
            "student_submission": student_submission
        }

    @classmethod
    def evaluate_list_sequence(
        cls, reference_items: List[str], student_items: List[str], is_ordered: bool = True
    ) -> Dict[str, Any]:
        """
        Mode E: List and Sequence Recall.
        Evaluates ordered steps (e.g. OSI layers, algorithms) or unordered items (features).
        """
        clean_ref = [item.strip() for item in reference_items if item.strip()]
        clean_sub = [item.strip() for item in student_items if item.strip()]

        total_ref = len(clean_ref)
        if total_ref == 0:
            return {"score": 1.0, "feedback": "Empty list"}

        # Normalize comparison
        ref_normalized = [r.lower() for r in clean_ref]
        sub_normalized = [s.lower() for s in clean_sub]

        found_items = []
        missing_items = []
        item_scores = []

        for idx, ref in enumerate(clean_ref):
            ref_low = ref_normalized[idx]
            # Check for best match in student submission
            best_ratio = 0.0
            best_sub_idx = -1
            for s_idx, sub_low in enumerate(sub_normalized):
                ratio = difflib.SequenceMatcher(None, ref_low, sub_low).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_sub_idx = s_idx

            if best_ratio >= 0.70:
                is_correct_position = (best_sub_idx == idx) if is_ordered else True
                found_items.append({
                    "item": ref,
                    "student_item": clean_sub[best_sub_idx] if best_sub_idx >= 0 else "",
                    "is_correct_position": is_correct_position,
                    "position_actual": best_sub_idx + 1 if best_sub_idx >= 0 else None,
                    "position_expected": idx + 1
                })
                # If ordered, discount if out of place
                item_score = 1.0 if is_correct_position else 0.6
                item_scores.append(item_score)
            else:
                missing_items.append(ref)
                item_scores.append(0.0)

        final_score = round(sum(item_scores) / total_ref, 2)
        return {
            "score": final_score,
            "total_items": total_ref,
            "recalled_count": len(found_items),
            "missing_items": missing_items,
            "found_items": found_items,
            "is_ordered": is_ordered,
            "feedback": f"Recalled {len(found_items)} of {total_ref} items."
        }
