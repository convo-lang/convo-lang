import json
import os

from dotenv import load_dotenv
from convo_lang import Conversation

from exporters.txt_exporter import resume_to_txt

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
defaultModel = "gpt-5-mini"
agent_configs={
    "env": {"OPENAI_API_KEY": OPENAI_API_KEY},
    "defaultModel": defaultModel
}

print("Running JobDescriptionAnalyzer agent...")
with open("data/job_description.txt", "r", encoding="utf-8") as f:
        job_description = f.read()
convo_job_description_analyzer = Conversation(agent_configs)
convo_job_description_analyzer.add_convo_file(
    "agents/jobDescriptionAnalyzer.convo"
)
job_data = convo_job_description_analyzer.complete(
    variables={"job_description": job_description}
)

print("Running CandidateProfileAnalyzer agent...")
with open("data/candidate_profile.txt", "r", encoding="utf-8") as f:
    candidate_profile = f.read()
convo_candidate_profile_analyzer = Conversation(agent_configs)
convo_candidate_profile_analyzer.add_convo_file(
    "agents/candidateProfileAnalyzer.convo"
)
profile_data = convo_candidate_profile_analyzer.complete(
    variables={"candidate_profile": candidate_profile}
)

print("Running ProfileJobMatcher agent...")
convo_profile_job_matcher = Conversation(agent_configs)
convo_profile_job_matcher.add_convo_file("agents/profileJobMatcher.convo")
match_data = convo_profile_job_matcher.complete(
    variables={"job_data": job_data, "profile_data": profile_data}
)

print("Running ResumeWriter agent...")
convo_resume_writer = Conversation(agent_configs)
convo_resume_writer.add_convo_file("agents/resumeWriter.convo")
resume_data = convo_resume_writer.complete(
    variables={"job_data": job_data, "match_data": match_data}
)

print("Running FitEvaluator agent...")
convo_fit_evaluator = Conversation(agent_configs)
convo_fit_evaluator.add_convo_file("agents/fitEvaluator.convo")
job_apply_decision = convo_fit_evaluator.complete(
    variables={"job_data": job_data, "match_data": match_data}
)

print("Creating resume...")
txt_content = resume_to_txt(json.loads(resume_data))
resume_file = "output/resume.txt"
with open("output/resume.txt", "w", encoding="utf-8") as f:
    f.write(txt_content)

decision_data = json.loads(job_apply_decision)
recommendation = decision_data.get("recommendation", {})
decision = recommendation.get("decision", "unknown")
confidence = recommendation.get("confidence", 0)

print("")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(f"Recommendation: {decision}  (confidence: {confidence:.2f})")
print(json.loads(job_apply_decision)["recommendation"]["summary"])
print(f"Resume is ready: {resume_file}")
