from typing import Dict, Any, List

def format_experience_snapshot(snapshot: Dict[str, Any]) -> str:
    lines: List[str] = []
    lines.append(snapshot["line1"])
    for item in snapshot.get("highlights", []):
        lines.append(f"- {item}")
    return "\n".join(lines)

def resume_to_txt(resume_data: Dict[str, Any]) -> str:
    resume = resume_data["resume"]
    output: List[str] = []
    output.append(resume["targetTitle"].upper())
    output.append("")
    output.append("SUMMARY")
    output.append(resume["summary"])
    output.append("")
    output.append("KEY SKILLS")
    output.append(", ".join(resume.get("keySkills", [])))
    output.append("")
    output.append("WORK EXPERIENCE")
    for exp in resume.get("workExperience", []):
        date_range = f'{exp["firstDate"]} – {exp.get("lastDate", "")}'.strip()
        output.append(f'{exp["title"]} — {exp["companyName"]} ({date_range})')
        output.append(
            format_experience_snapshot(exp["experienceSnapshot"])
        )
        output.append("")
    projects = resume.get("projects")
    if projects:
        output.append("PROJECTS")
        for proj in projects:
            date_range = f'{proj["firstDate"]} – {proj.get("lastDate", "")}'.strip()
            output.append(f'{proj["title"]} ({date_range})')
            output.append(
                format_experience_snapshot(proj["experienceSnapshot"])
            )
            output.append("")
    return "\n".join(output)
