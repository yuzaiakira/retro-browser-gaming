#!/usr/bin/env python3
"""PH-18 — Build provenance + grouped counsel review queues for NLR tip files.

Does NOT approve licenses, forge counsel decisions, or clear PUBLIC_SOURCE_MIRROR_READY.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "docs" / "release" / "public-source-file-policy.json"
LEGAL_PACK = ROOT / "docs" / "release" / "legal-review" / "legal-review-pack.json"
CS_MATRIX = ROOT / "docs" / "open-source" / "corresponding-source-matrix.json"
ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"
LICENSES_MD = ROOT / "docs" / "licenses-and-assets.md"
OUT_DIR = ROOT / "docs" / "release" / "legal-review"

EJS_PIN = "e150dc0491ae747028919fb82d6598954976ede6"
EJS_UPSTREAM = f"https://github.com/EmulatorJS/EmulatorJS/tree/{EJS_PIN}"


def git_head() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()


def git_log_authors(path: str, limit: int = 5) -> list[str]:
    proc = subprocess.run(
        ["git", "log", "--format=%an <%ae>", f"-n{limit}", "--", path],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    authors = []
    for line in (proc.stdout or "").splitlines():
        if line and line not in authors:
            authors.append(line)
    return authors


def parse_licenses_md() -> dict[str, dict]:
    """Map fixture basename / path → provenance row from licenses-and-assets.md."""
    if not LICENSES_MD.is_file():
        return {}
    rows: dict[str, dict] = {}
    for line in LICENSES_MD.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| `"):
            continue
        # | `.fixtures/foo` | `sha` | source | license |
        parts = [p.strip() for p in line.strip("|").split("|")]
        if len(parts) < 4:
            continue
        path = parts[0].strip("`")
        if not path.startswith("."):
            continue
        sha = parts[1].strip("`")
        source = parts[2]
        license_field = parts[3]
        spdx = None
        if "MIT" in license_field and "GPL" not in license_field:
            spdx = "MIT"
        elif "GPL-3.0" in license_field or "GPL‑3.0" in license_field:
            spdx = "GPL-3.0-only"
        elif "GPL-2.0" in license_field:
            spdx = "GPL-2.0-only"
        elif "CC0" in license_field:
            spdx = "CC0-1.0"
        elif "LGPL" in license_field:
            spdx = "LGPL-3.0-only"
        elif "Apache" in license_field:
            spdx = "Apache-2.0"
        notice = None
        m = re.search(r"`(LICENSES/[^`]+)`", license_field)
        if m:
            notice = m.group(1)
        m2 = re.search(r"`(fixtures/[^`]+LICENSE[^`]*)`", license_field)
        if m2:
            notice = notice or m2.group(1)
        rows[path] = {
            "sha256": sha if re.fullmatch(r"[0-9a-f]{64}", sha) else None,
            "source": source,
            "license_field": license_field,
            "spdx": spdx,
            "notice_path": notice,
        }
    return rows


def load_json(path: Path) -> dict | list | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def fixture_kind(path: str) -> str:
    if "/fixtures/" in path or path.startswith("fixtures/"):
        return "test_fixture_source_tree"
    return "test_fixture"


def classify_kind(path: str) -> str:
    lower = path.lower()
    if path.startswith((".fixtures/", "fixtures/")):
        if path.endswith((".md", ".txt", ".sha256", ".README.md")) or path.endswith(
            "README.md"
        ):
            return "documentation"
        if path.endswith(
            (
                ".js",
                ".c",
                ".h",
                ".s",
                ".asm",
                ".ld",
                ".cmake",
                ".json",
                ".html",
                ".makefile",
            )
        ) or "/src/" in path:
            return "test_fixture_source"
        return "test_fixture"
    if path.startswith("scripts/patches/"):
        if path.endswith(".md"):
            return "documentation"
        return "modified_upstream_source"
    if path.startswith("scripts/build-"):
        return "build_script"
    if path.endswith((".md", ".txt", "LICENSE", "LICENSE_MIT", "LICENSE_APACHE")):
        return "documentation"
    if path.endswith((".json",)) and "PROVENANCE" in path:
        return "documentation"
    if path.endswith((".wasm", ".data", ".bin", ".rom", ".chd")):
        return "binary_or_generated_artifact"
    if "/cores/" in path and path.endswith((".js", ".css", ".html", ".wasm")):
        # Tip has no wasm tracked under NLR usually — JS may embed third-party
        return "unmodified_third_party_source"
    if path.endswith((".js", ".mjs", ".cjs", ".ts", ".tsx")):
        return "unmodified_third_party_source"
    return "unknown_provenance"


def component_for(path: str) -> str:
    if path.startswith("apps/web/public/cores/ejs-4.2.3/"):
        return "emulatorjs-4.2.3"
    if path.startswith("apps/web/public/cores/js2me/"):
        return "js2me"
    if path.startswith("apps/web/public/cores/jsdos-8.3.8/"):
        return "jsdos-8.3.8"
    if path.startswith("apps/web/public/cores/ruffle-0.7.1/"):
        return "ruffle-0.7.1"
    if path.startswith("apps/web/public/cores/hatari-2.6.1/"):
        return "hatari-2.6.1"
    if path.startswith("apps/web/public/cores/mame-rbg-arcade/"):
        return "mame-rbg-arcade"
    if path.startswith("scripts/patches/81_eo/"):
        return "patch-81_eo"
    if path.startswith("scripts/patches/atari800/"):
        return "patch-atari800"
    if path.startswith("scripts/patches/bluemsx/"):
        return "patch-bluemsx"
    if path.startswith("scripts/patches/hatari"):
        return "patch-hatari"
    if path.startswith("scripts/patches/mame"):
        return "patch-mame-rbgdot"
    if path.startswith("scripts/patches/vecx/"):
        return "patch-vecx"
    if path.startswith("scripts/build-mame"):
        return "mame-rbg-arcade-build"
    if path.startswith(".fixtures/") or path.startswith("fixtures/"):
        # group by license family prefix
        base = Path(path).name
        for prefix in (
            "mit-",
            "gpl-",
            "cc0-",
            "huc-",
            "fds-",
            "dot_",
            "dreamcast",
        ):
            if base.startswith(prefix) or prefix in base:
                return f"fixture:{prefix.rstrip('-_')}"
        return "fixture:misc"
    return "unknown"


def build_entries() -> tuple[list[dict], dict]:
    policy = load_json(POLICY)
    assert isinstance(policy, dict)
    nlr_paths = [
        f["path"] for f in policy["files"] if f["class"] == "NEEDS_LEGAL_REVIEW"
    ]
    assert len(nlr_paths) == policy["summary"]["counts"]["NEEDS_LEGAL_REVIEW"]

    fixture_rows = parse_licenses_md()
    legal = load_json(LEGAL_PACK) or {}
    cs = load_json(CS_MATRIX) or {}
    allow = load_json(ALLOWLIST) or {}

    # Index legal pack / CS by basename path under cores/
    legal_by_tail: dict[str, dict] = {}
    for e in legal.get("entries", []):
        legal_by_tail[e["path"]] = e
        legal_by_tail[e["path"].split("/")[-1]] = e

    ruffle_prov = None
    rp = ROOT / "apps/web/public/cores/ruffle-0.7.1/RBG-PROVENANCE.json"
    if rp.is_file():
        ruffle_prov = json.loads(rp.read_text(encoding="utf-8"))

    js2me_commit = None
    jc = ROOT / "apps/web/public/cores/js2me/SOURCE_COMMIT.txt"
    if jc.is_file():
        js2me_commit = jc.read_text(encoding="utf-8").strip().splitlines()[0]

    entries: list[dict] = []
    unresolved_provenance = 0

    for path in sorted(nlr_paths):
        kind = classify_kind(path)
        component = component_for(path)
        authors = git_log_authors(path)
        upstream = None
        revision = None
        license_name = None
        spdx = None
        notices: list[str] = []
        modifications = "none_documented"
        source_to_binary: list[str] = []
        ownership = "unknown"
        review_track = "counsel_decision_required"
        provenance_gaps: list[str] = []
        evidence: list[str] = []
        questions: list[str] = []

        # --- Fixtures ---
        if path.startswith(".fixtures/") or path.startswith("fixtures/"):
            ownership = "third_party_or_first_party_fixture"
            row = fixture_rows.get(path)
            base = Path(path).name
            # Heuristic: map dreamcast multi-file set to documented dreamcast-dot
            if not row and "dreamcast-dot" in path:
                row = fixture_rows.get(".fixtures/mit-dreamcast-dot.elf") or fixture_rows.get(
                    ".fixtures/mit-dreamcast-dot.chd"
                )
            # fixtures/ source tree LICENSE
            tree_license = None
            if path.startswith("fixtures/"):
                parts = Path(path).parts
                if len(parts) >= 2:
                    tree_dir = ROOT / parts[0] / parts[1]
                    lic_files = list(tree_dir.glob("LICENSE*"))
                    if lic_files:
                        tree_license = str(lic_files[0].relative_to(ROOT))
            # Sibling README under .fixtures
            sibling_readme = None
            if path.startswith(".fixtures/"):
                prefix = base
                for cand in sorted((ROOT / ".fixtures").glob("*.README.md")):
                    stem = cand.name.replace(".README.md", "")
                    if base.startswith(stem) or stem in base:
                        sibling_readme = str(cand.relative_to(ROOT))
                        break
            # LICENSES/* by filename tokens
            lic_hits = []
            tokens = [
                t
                for t in re.split(r"[-_.]", base.replace("mit-", "").replace("gpl-", "").replace("cc0-", ""))
                if len(t) > 3
            ]
            for lic in (ROOT / "LICENSES").glob("*"):
                ln = lic.name.lower()
                if any(t.lower() in ln for t in tokens[:3]):
                    lic_hits.append(f"LICENSES/{lic.name}")

            if row:
                upstream = row["source"]
                revision = "see source field (release/commit pin in licenses-and-assets.md)"
                license_name = row["license_field"]
                spdx = row["spdx"]
                if row["notice_path"]:
                    notices.append(row["notice_path"])
                evidence.append("docs/licenses-and-assets.md")
                if row["sha256"]:
                    evidence.append(f"sha256:{row['sha256']}")
                review_track = "third_party_license_interpretation"
                questions.append(
                    "May this fixture be redistributed in a public GitHub SOURCE repository?"
                )
                questions.append(
                    "Are attribution/NOTICE requirements satisfied as packaged?"
                )
            elif tree_license:
                notices.append(tree_license)
                evidence.append(tree_license)
                license_name = f"see {tree_license}"
                # Try SPDX from filename prefix
                if base.startswith("mit-") or "/mit-" in path or path.startswith("fixtures/"):
                    # read first line of license if MIT
                    try:
                        body = (ROOT / tree_license).read_text(encoding="utf-8", errors="ignore")[:200]
                        if "MIT License" in body or "Permission is hereby granted" in body:
                            spdx = "MIT"
                            license_name = "MIT (from tree LICENSE)"
                        elif "GPL" in body:
                            spdx = "GPL-3.0-or-later"
                            license_name = "GPL (from tree LICENSE — confirm version)"
                    except OSError:
                        pass
                ownership = "likely_first_party_or_upstream_homebrew_source"
                review_track = "first_party_attestation"
                provenance_gaps.append(
                    "source-tree LICENSE present but not linked from licenses-and-assets.md row for this exact path"
                )
                questions.append(
                    "Owner attestation: originality vs upstream; confirm public SOURCE redistribution."
                )
                questions.append(
                    "Counsel: accept tree LICENSE as sufficient notice for these paths?"
                )
            else:
                if sibling_readme:
                    evidence.append(sibling_readme)
                notices.extend(lic_hits[:3])
                if lic_hits or sibling_readme:
                    review_track = "third_party_license_interpretation"
                    provenance_gaps.append(
                        "partial provenance (README and/or LICENSES heuristic) — no exact licenses-and-assets.md row"
                    )
                    if "mit-" in base:
                        spdx = "MIT"
                        license_name = "MIT (inferred from filename prefix + LICENSES hit — confirm)"
                    elif "gpl-" in base:
                        spdx = "GPL-3.0-only"
                        license_name = "GPL (inferred from filename prefix — confirm version)"
                    elif "cc0-" in base:
                        spdx = "CC0-1.0"
                        license_name = "CC0-1.0 (inferred — confirm)"
                    else:
                        license_name = "unknown — see evidence"
                    questions.append(
                        "Confirm SPDX, upstream URL/revision, and redistribution for public SOURCE."
                    )
                else:
                    unresolved_provenance += 1
                    provenance_gaps.append(
                        "no exact row in docs/licenses-and-assets.md and no tree LICENSE/README hit"
                    )
                    review_track = "missing_license_evidence"
                    questions.append(
                        "Establish SPDX, upstream URL/revision, and redistribution permission."
                    )

            kind = (
                "documentation"
                if path.endswith((".md", ".txt", ".sha256"))
                else "test_fixture"
            )
            if path.endswith((".c", ".h", ".s", ".js", ".html", ".ld")) or "/src/" in path:
                kind = "test_fixture_source"
                if review_track != "missing_license_evidence":
                    ownership = "likely_first_party_or_upstream_homebrew_source"
                    if review_track == "third_party_license_interpretation" and tree_license:
                        review_track = "first_party_attestation"

        # --- EmulatorJS tracked JS ---
        elif component == "emulatorjs-4.2.3":
            ownership = "third_party"
            upstream = EJS_UPSTREAM
            revision = EJS_PIN
            license_name = "GPL-3.0-or-later (EmulatorJS packaging; core-specific notices)"
            spdx = "GPL-3.0-or-later"
            notices = ["LICENSES/EmulatorJS-GPL-3.0.txt", "docs/open-source/third-party-notices.md"]
            evidence = [
                "docs/open-source/corresponding-source-matrix.json",
                "apps/web/public/cores/ejs-4.2.3/version.json",
            ]
            source_to_binary = [
                "Private-store *.wasm/*.data under ejs-4.2.3/ (history-removed; tip-absent)"
            ]
            review_track = "third_party_license_interpretation"
            if "81_eo" in path or "virtualjaguar_js" in path:
                review_track = "restricted_redistribution"
                modifications = "NOT_CLEARED lineage metadata — see not-cleared-cores.md"
                questions.append(
                    "Confirm BLOCKED_LEGAL / NOT_CLEARED status remains for public SOURCE mention of this lineage."
                )
            else:
                questions.append(
                    "May EmulatorJS 4.2.3 tracked JS/CSS/localization be published in public SOURCE?"
                )
                questions.append(
                    "Does public SOURCE of loaders without binaries satisfy GPL corresponding-source expectations when binaries are offered separately?"
                )
            kind = (
                "documentation"
                if path.endswith((".md", ".json")) and "src/" not in path and "localization" not in path
                else "unmodified_third_party_source"
            )
            if path.endswith(".json") and "/reports/" in path:
                kind = "generated_source"
                provenance_gaps.append(
                    "core report JSON — confirm whether generated and redistributable"
                )

        # --- js2me ---
        elif component == "js2me":
            ownership = "third_party"
            upstream = "https://github.com/OsamaAbbas/js2me"
            revision = js2me_commit
            license_name = "MIT"
            spdx = "MIT"
            notices = [
                "apps/web/public/cores/js2me/LICENSE",
                "LICENSES/js2me-MIT.txt",
                "apps/web/public/cores/js2me/ATTRIBUTION.md",
            ]
            evidence = [
                "apps/web/public/cores/js2me/SOURCE_COMMIT.txt",
                "apps/web/public/cores/js2me/LICENSE_NOTE.txt",
            ]
            review_track = "third_party_license_interpretation"
            questions.append(
                "Confirm vendored js2me tree at pinned commit may be published publicly under MIT."
            )
            questions.append(
                "Review javax/crypto and other packages for additional notices."
            )
            if "/me/javax/crypto/" in path:
                provenance_gaps.append(
                    "crypto-related JS path — confirm no export-control / additional license issues"
                )
            kind = (
                "documentation"
                if Path(path).name
                in {
                    "LICENSE",
                    "LICENSE_NOTE.txt",
                    "ATTRIBUTION.md",
                    "CONTRIBUTORS.md",
                    "README.md",
                    "SOURCE_COMMIT.txt",
                }
                else "unmodified_third_party_source"
            )

        # --- jsdos ---
        elif component == "jsdos-8.3.8":
            ownership = "third_party"
            upstream = "js-dos / emulators (see LICENSE.txt + third-party-notices)"
            revision = "8.3.8"
            license_name = "GPL-2.0-only (see LICENSE.txt)"
            spdx = "GPL-2.0-only"
            notices = [
                "apps/web/public/cores/jsdos-8.3.8/LICENSE.txt",
                "LICENSES/emulators-jsdos-GPL-2.0.txt",
            ]
            source_to_binary = [
                "Private-store wdosbox.wasm / wlibzip.wasm (history-removed)"
            ]
            review_track = "third_party_license_interpretation"
            questions.append(
                "May jsdos 8.3.8 JS loaders be published in public SOURCE with GPL-2.0 obligations?"
            )
            kind = (
                "documentation"
                if path.endswith((".txt", ".md"))
                else "unmodified_third_party_source"
            )

        # --- ruffle ---
        elif component == "ruffle-0.7.1":
            ownership = "third_party"
            if ruffle_prov:
                upstream = ruffle_prov.get("download_url")
                revision = ruffle_prov.get("source_commit") or ruffle_prov.get(
                    "source_tag"
                )
                license_name = ruffle_prov.get("license")
                spdx = "MIT OR Apache-2.0"
            notices = [
                "apps/web/public/cores/ruffle-0.7.1/LICENSE_MIT",
                "apps/web/public/cores/ruffle-0.7.1/LICENSE_APACHE",
                "LICENSES/ruffle-MIT.txt",
                "LICENSES/ruffle-Apache-2.0.txt",
            ]
            evidence = ["apps/web/public/cores/ruffle-0.7.1/RBG-PROVENANCE.json"]
            review_track = "third_party_license_interpretation"
            questions.append(
                "Confirm selfhosted Ruffle 0.7.1 package may be mirrored publicly under MIT OR Apache-2.0."
            )
            if path.endswith(".wasm"):
                kind = "binary_or_generated_artifact"
                review_track = "restricted_redistribution"
                provenance_gaps.append(
                    "unexpected wasm in tip under NLR — verify tip hygiene"
                )
            else:
                kind = (
                    "documentation"
                    if "LICENSE" in path or path.endswith((".md", ".json"))
                    else "unmodified_third_party_source"
                )

        # --- hatari ---
        elif component == "hatari-2.6.1":
            ownership = "third_party"
            upstream = "https://github.com/hatari/hatari (wasm build — see docs/emulator-builds)"
            revision = "2.6.1"
            license_name = "GPL-2.0-or-later"
            spdx = "GPL-2.0-or-later"
            notices = ["LICENSES/hatari-GPL-2.0.txt", "LICENSES/emutos-GPL-2.0.txt"]
            source_to_binary = ["Private-store hatari.wasm/.data when provisioned"]
            review_track = "third_party_license_interpretation"
            questions.append(
                "May hatari.js glue be published publicly; confirm EmuTOS/firmware notices."
            )
            kind = "unmodified_third_party_source"

        # --- MAME LOCAL_ONLY ---
        elif component.startswith("mame-rbg"):
            ownership = "third_party_modified"
            upstream = "MAME (SUBTARGET rbgdot) — LOCAL_ONLY"
            revision = "see docs/emulator-builds/mame-wasm-arcade.md"
            license_name = "GPL-2.0-or-later (MAME)"
            spdx = "GPL-2.0-or-later"
            notices = ["LICENSES/arcade-rbgdot-MIT.txt"]  # fixture only; MAME separate
            modifications = "LOCAL_ONLY engineering build; not cleared for PUBLIC_BROWSER"
            evidence = [
                "docs/open-source/not-cleared-cores.md",
                "docs/emulator-builds/mame-wasm-arcade.md",
                "docs/open-source/browser-distributable-allowlist.json",
            ]
            review_track = "restricted_redistribution"
            questions.append(
                "Confirm rbg_arcade.js/html remain LOCAL_ONLY for product; may SOURCE publish glue/scripts?"
            )
            questions.append(
                "Do not clear PUBLIC_BROWSER distribution without separate counsel + product decision."
            )
            kind = "build_script" if path.endswith(".sh") else "modified_upstream_source"

        # --- patches ---
        elif component.startswith("patch-"):
            ownership = "first_party_patch_against_third_party"
            review_track = "counsel_decision_required"
            kind = (
                "documentation"
                if path.endswith(".md")
                else "modified_upstream_source"
            )
            patch_dir = path.split("/")[2] if len(path.split("/")) > 2 else component
            evidence = [f"scripts/patches/{patch_dir}/"]
            if "81_eo" in path:
                license_name = "GPL-3.0 (upstream 81-libretro) + RBG patch"
                spdx = "GPL-3.0-or-later"
                upstream = "https://github.com/libretro/81-libretro"
                modifications = "eo_loadp / CRT / joypad — NOT_CLEARED binary lineage"
                review_track = "restricted_redistribution"
                questions.append(
                    "Publishing patch text vs redistributing modified binary — confirm obligations."
                )
            elif "vecx" in path:
                license_name = "see vecx upstream + patch"
                review_track = "restricted_redistribution"
                questions.append(
                    "Vectrex BIOS remains BLOCKED_EXTERNAL — confirm patch publication is OK without BIOS."
                )
            elif "mame" in path:
                review_track = "restricted_redistribution"
                questions.append(
                    "MAME rbgdot patches — LOCAL_ONLY product class; SOURCE publication of patches?"
                )
            else:
                license_name = "upstream GPL family + RBG patch"
                questions.append(
                    "Confirm patch corresponding-source completeness for any public binary offer."
                )
            if not license_name:
                unresolved_provenance += 1
                provenance_gaps.append("patch license/upstream incomplete")

        else:
            unresolved_provenance += 1
            provenance_gaps.append("no component mapper matched")
            review_track = "missing_license_evidence"
            questions.append("Identify ownership, license, and redistribution rights.")

        # Contradictions: tip wasm under NLR
        if path.endswith((".wasm", ".data")) and "/cores/" in path:
            provenance_gaps.append("binary payload unexpected in SOURCE tip policy")
            review_track = "technical_metadata_correction"

        if provenance_gaps and review_track == "counsel_decision_required":
            unresolved_provenance += 0  # already counted when added

        entry = {
            "path": path,
            "mirror_class": "NEEDS_LEGAL_REVIEW",
            "kind": kind,
            "component": component,
            "ownership_hypothesis": ownership,
            "upstream_repository": upstream,
            "upstream_revision": revision,
            "license_name": license_name,
            "spdx": spdx,
            "notice_paths": notices,
            "modifications": modifications,
            "source_to_binary_relationships": source_to_binary,
            "git_authors_sample": authors,
            "git_authorship_disclaimer": (
                "Git authorship does not establish copyright ownership or redistribution permission."
            ),
            "review_track": review_track,
            "provenance_gaps": provenance_gaps,
            "evidence": evidence,
            "counsel_questions": questions,
            "approval_status": "NEEDS_LEGAL_REVIEW",
            "auto_approved": False,
        }
        entries.append(entry)

    meta = {
        "nlr_input_count": len(nlr_paths),
        "entries_emitted": len(entries),
        "unresolved_provenance_entries": sum(
            1 for e in entries if e["provenance_gaps"]
        ),
        "policy_sha": policy.get("classified_tree_sha"),
    }
    return entries, meta


def build_groups(entries: list[dict]) -> tuple[list[dict], dict]:
    """Group by component + spdx + review_track + modifications class."""
    buckets: dict[tuple, list[dict]] = defaultdict(list)
    for e in entries:
        key = (
            e["component"],
            e.get("spdx") or "SPDX_UNKNOWN",
            e["review_track"],
            e["modifications"],
            e.get("upstream_revision") or "REV_UNKNOWN",
        )
        buckets[key].append(e)

    groups = []
    legal_questions = 0
    for i, (key, members) in enumerate(sorted(buckets.items(), key=lambda x: x[0][0]), 1):
        component, spdx, track, mods, rev = key
        paths = [m["path"] for m in members]
        # Collect unique questions
        qset = []
        for m in members:
            for q in m["counsel_questions"]:
                if q not in qset:
                    qset.append(q)
        legal_questions += len(qset)
        gaps = sorted(
            {
                g
                for m in members
                for g in m["provenance_gaps"]
            }
        )
        groups.append(
            {
                "group_id": f"RG-{i:03d}",
                "component": component,
                "spdx": spdx,
                "upstream_revision": rev,
                "review_track": track,
                "modifications": mods,
                "member_count": len(members),
                "members": paths,
                "approval_status": "NEEDS_LEGAL_REVIEW",
                "auto_approved": False,
                "independent_legal_questions": qset,
                "provenance_gaps": gaps,
                "required_human_decision": track
                in {
                    "counsel_decision_required",
                    "third_party_license_interpretation",
                    "restricted_redistribution",
                    "first_party_attestation",
                    "missing_license_evidence",
                },
                "notes": (
                    "Do not combine with other groups that have different SPDX, "
                    "upstream revision, or redistribution restrictions."
                ),
            }
        )

    summary = {
        "original_nlr_files": len(entries),
        "review_groups": len(groups),
        "groups_with_provenance_gaps": sum(1 for g in groups if g["provenance_gaps"]),
        "independent_legal_questions": legal_questions,
        "groups_by_track": {},
    }
    track_counts: dict[str, int] = defaultdict(int)
    for g in groups:
        track_counts[g["review_track"]] += 1
    summary["groups_by_track"] = dict(track_counts)
    return groups, summary


def write_owner_attestation(entries: list[dict], groups: list[dict]) -> str:
    first_party = [
        e
        for e in entries
        if e["review_track"] == "first_party_attestation"
        or e["ownership_hypothesis"]
        in {
            "likely_first_party_or_upstream_homebrew_source",
            "first_party_patch_against_third_party",
        }
    ]
    lines = [
        "# Owner attestation review queue (PH-18)",
        "",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"**Git HEAD:** `{git_head()}`",
        "",
        "## Policy",
        "",
        "- Git authorship **does not** establish copyright ownership or redistribution permission.",
        "- Do **not** fabricate signatures or attestations.",
        "- Owner must attest in writing; automation never marks APPROVED.",
        "",
        f"**Candidate files for owner attestation:** {len(first_party)}",
        "",
        "| Path | Hypothesis | Authors (git sample) | Required attestation |",
        "|---|---|---|---|",
    ]
    for e in first_party:
        authors = "; ".join(e["git_authors_sample"][:2]) or "(none in log sample)"
        lines.append(
            f"| `{e['path']}` | {e['ownership_hypothesis']} | {authors} | "
            f"Confirm originality / upstream license / right to publish |"
        )
    lines.extend(
        [
            "",
            "## Patch directories (first-party modifications of third-party code)",
            "",
        ]
    )
    for g in groups:
        if g["component"].startswith("patch-"):
            lines.append(
                f"- **{g['group_id']}** `{g['component']}` — {g['member_count']} files — "
                f"status `{g['approval_status']}`"
            )
    lines.extend(
        [
            "",
            "## Explicit non-actions",
            "",
            "- No attestations were signed in this session.",
            "- No file was moved from NEEDS_LEGAL_REVIEW to PUBLIC_SOURCE_ALLOWED.",
            "",
        ]
    )
    return "\n".join(lines)


def write_counsel_pack(
    entries: list[dict], groups: list[dict], summary: dict, meta: dict
) -> str:
    lines = [
        "# Counsel review pack (PH-18) — NEEDS_LEGAL_REVIEW tip files",
        "",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"**Git HEAD:** `{git_head()}`",
        f"**Policy tip SHA (classification):** `{meta.get('policy_sha')}`",
        "",
        "## Executive counts",
        "",
        f"- Original NEEDS_LEGAL_REVIEW files: **{summary['original_nlr_files']}**",
        f"- Review groups: **{summary['review_groups']}**",
        f"- Groups with provenance gaps: **{summary['groups_with_provenance_gaps']}**",
        f"- Independent legal questions (sum across groups): **{summary['independent_legal_questions']}**",
        f"- Entries with ≥1 provenance gap: **{meta['unresolved_provenance_entries']}**",
        "",
        "## Gate posture (unchanged by this pack)",
        "",
        "- `PUBLIC_SOURCE_MIRROR_READY` = **NOT_CLEARED** until real counsel decisions exist",
        "- `GITHUB_SOURCE_PUSH_READY` = **NOT_CLEARED**",
        "- `PUBLIC_RELEASE_GO` = **STOP**",
        "",
        "Do **not** treat this pack as approval. Do **not** copy `counsel-decisions.json.example` as live decisions.",
        "",
        "## Preserved restrictions (do not silently change)",
        "",
        "| Class | Examples |",
        "|---|---|",
        "| LOCAL_ONLY | Flycast wasm packs; MAME `rbg_arcade.*` |",
        "| BLOCKED_LEGAL / NOT_CLEARED | `81_eo*`, `virtualjaguar_js*` |",
        "| BLOCKED_EXTERNAL | ColecoVision BIOS; Vectrex `system.img` |",
        "",
        "## Review groups",
        "",
    ]
    for g in groups:
        lines.append(
            f"### {g['group_id']} — `{g['component']}` ({g['member_count']} files)"
        )
        lines.append("")
        lines.append(f"- SPDX: `{g['spdx']}`")
        lines.append(f"- Upstream revision: `{g['upstream_revision']}`")
        lines.append(f"- Review track: **{g['review_track']}**")
        lines.append(f"- Modifications: {g['modifications']}")
        lines.append(f"- Approval status: `{g['approval_status']}` (not auto-approved)")
        if g["provenance_gaps"]:
            lines.append(f"- Provenance gaps: {'; '.join(g['provenance_gaps'])}")
        lines.append("- Questions:")
        for q in g["independent_legal_questions"]:
            lines.append(f"  1. {q}")
        lines.append(f"- Members: see `review-groups.json` → `{g['group_id']}.members`")
        lines.append("")

    lines.extend(
        [
            "## Exact counsel actions",
            "",
            "1. Review each `RG-*` group (and underlying paths in `file-provenance.json`).",
            "2. For each `artifact_id` in `legal-review-pack.json` that maps to published binaries, decide `CLEARED_FOR_PUBLIC` or `WITHHOLD`.",
            "3. Write decisions only into a real `counsel-decisions.json` (never forge).",
            "4. Owner completes attestation queue for first-party / patch originality claims.",
            "5. Re-run `python3 scripts/check-public-source-mirror-ready.py` — expect NOT_CLEARED until decisions land.",
            "",
            "## Remaining blockers",
            "",
            "1. Missing live `counsel-decisions.json`.",
            "2. All 562 tip NLR files still `NEEDS_LEGAL_REVIEW`.",
            "3. LOCAL_ONLY / BLOCKED_* product restrictions unchanged.",
            "4. Public destination for Option B mirror not authorized.",
            "",
            "## Related machine-readable files",
            "",
            "- `file-provenance.json`",
            "- `review-groups.json`",
            "- `owner-attestation-queue.md`",
            "- `legal-review-pack.json` (binary-centric CS pack; still 0 counsel approvals)",
            "",
        ]
    )
    return "\n".join(lines)


def maybe_annotate_classifier_diagnostics() -> None | dict:
    """Document diagnostics only — no class flips to ALLOWED."""
    return {
        "note": "PH-18 did not reclassify any NEEDS_LEGAL_REVIEW path to PUBLIC_SOURCE_ALLOWED.",
        "diagnostics_added": [
            "file-provenance.json kind/ownership/spdx fields for counsel efficiency",
            "review-groups.json exact membership",
        ],
        "before_after": {
            "NEEDS_LEGAL_REVIEW_count_before": 562,
            "NEEDS_LEGAL_REVIEW_count_after": 562,
            "PUBLIC_SOURCE_ALLOWED_changes": 0,
        },
        "reviewer_requirement": "Counsel + owner attestation — not automation",
    }


def main() -> int:
    head = git_head()
    entries, meta = build_entries()
    groups, summary = build_groups(entries)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    provenance = {
        "schema": "rbg-file-provenance-v1",
        "phase": "PH-18",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_head": head,
        "policy_classified_tree_sha": meta.get("policy_sha"),
        "policy_note": (
            "Sanitized history ≠ legal publishability. Finding metadata ≠ approval."
        ),
        "coverage": {
            "nlr_files_expected": meta["nlr_input_count"],
            "nlr_files_documented": meta["entries_emitted"],
            "complete": meta["nlr_input_count"] == meta["entries_emitted"],
            "entries_with_provenance_gaps": meta["unresolved_provenance_entries"],
        },
        "classifier_diagnostics": maybe_annotate_classifier_diagnostics(),
        "entries": entries,
    }
    (OUT_DIR / "file-provenance.json").write_text(
        json.dumps(provenance, indent=2) + "\n", encoding="utf-8"
    )

    rg = {
        "schema": "rbg-legal-review-groups-v1",
        "phase": "PH-18",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_head": head,
        "summary": summary,
        "groups": groups,
        "auto_approved_groups": 0,
        "policy": "Do not mark any group APPROVED without written human counsel/owner decision.",
    }
    (OUT_DIR / "review-groups.json").write_text(
        json.dumps(rg, indent=2) + "\n", encoding="utf-8"
    )

    (OUT_DIR / "owner-attestation-queue.md").write_text(
        write_owner_attestation(entries, groups), encoding="utf-8"
    )
    (OUT_DIR / "counsel-review-pack.md").write_text(
        write_counsel_pack(entries, groups, summary, meta), encoding="utf-8"
    )

    # Refresh legal-review README pointer
    readme = OUT_DIR / "README.md"
    extra = (
        "\n## PH-18 tip-file review queues\n\n"
        "| File | Purpose |\n"
        "|---|---|\n"
        "| `file-provenance.json` | Per-path provenance for all NEEDS_LEGAL_REVIEW tip files |\n"
        "| `review-groups.json` | Grouped review units with exact membership |\n"
        "| `owner-attestation-queue.md` | Owner attestation candidates (unsigned) |\n"
        "| `counsel-review-pack.md` | Counsel-facing grouped questions |\n"
        "\n"
        f"**PH-18 counts:** {summary['original_nlr_files']} files → "
        f"{summary['review_groups']} groups; "
        f"{summary['independent_legal_questions']} independent questions; "
        f"approved_by_automation=0.\n"
    )
    text = readme.read_text(encoding="utf-8") if readme.is_file() else "# Legal review\n"
    if "PH-18 tip-file review queues" not in text:
        readme.write_text(text.rstrip() + "\n" + extra, encoding="utf-8")

    print(json.dumps({"summary": summary, "coverage": provenance["coverage"]}, indent=2))
    return 0 if provenance["coverage"]["complete"] else 1


if __name__ == "__main__":
    sys.exit(main())
