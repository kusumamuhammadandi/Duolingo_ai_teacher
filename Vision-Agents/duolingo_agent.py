import logging
from typing import Any, Dict
from dotenv import load_dotenv
from vision_agents.core import Agent, AgentLauncher, Runner, User
from vision_agents.plugins import deepgram, elevenlabs, gemini, getstream

logger = logging.getLogger(__name__)
load_dotenv()

async def create_agent(**kwargs) -> Agent:
    llm = gemini.LLM("gemini-flash-lite-latest")
    agent = Agent(
        edge=getstream.Edge(),
        agent_user=User(name="Duo", id="agent"),
        instructions="""
            You are Duo, a friendly AI language teacher inspired by Duolingo.
            You are currently teaching Japanese to the user.
            Keep responses short, encouraging, and conversational.
            Use simple Japanese words and always explain their meaning.
            Celebrate small wins with phrases like 'Great job!' or 'Sugoi!'.
            Do not use special characters or markdown formatting.
            Always stay in teaching mode — guide the user through vocabulary and phrases.
        """,
        processors=[],
        llm=llm,
        tts=elevenlabs.TTS(),
        stt=deepgram.STT(eager_turn_detection=True),
    )
    return agent

async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    call = await agent.create_call(call_type, call_id)
    async with agent.join(call):
        await agent.simple_response(
            "Introduce yourself as Duo the language teacher and say konnichiwa, then ask the user what Japanese word they want to learn today."
        )
        await agent.finish()

if __name__ == "__main__":
    Runner(
        AgentLauncher(create_agent=create_agent, join_call=join_call),
    ).cli()