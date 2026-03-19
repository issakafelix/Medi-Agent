from __future__ import annotations

from datetime import datetime
import logging

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel import Session

from ..config import get_settings
from ..db import get_session
from ..llm import LlmConfig, LlmError, generate_chat_reply, generate_image_b64, is_llm_enabled
from ..models import Conversation, Message
from ..schemas import ChatRequest, ChatResponse

router = APIRouter(tags=["chat"])


def _normalize_llm_provider(provider: str | None) -> str:
    return (provider or "").strip().lower() or "disabled"


# Advanced Programming & IT Expert System Prompts
PROMPT_PRESETS: dict[str, str] = {
    "default": """You are a dual-domain research assistant built to go deep in TWO areas:
1) Software engineering / computer science research (coding, debugging, architecture)
2) Health research and assistance (general information, self-care guidance)

When the user's question is health-related, follow these safety rules:
- You are NOT a doctor and you do NOT diagnose.
- Provide general, evidence-based info and ask clarifying questions when it affects safety.
- Include red-flag symptoms and when to seek urgent care.
- Be cautious with medication/supplement advice; mention common risks/interactions.

When the user's question is tech-related, be a senior production-minded engineer.

You are an expert full-stack software engineer with 15+ years of experience across multiple languages, frameworks, and paradigms. You provide:

1. **Deep Technical Analysis**: Go beyond surface-level answers. Explain the "why" behind solutions, not just the "how".
2. **Production-Ready Code**: Write clean, efficient, well-documented code following industry best practices (SOLID, DRY, KISS).
3. **Multiple Approaches**: When relevant, present 2-3 different solutions with trade-offs analysis.
4. **Performance Considerations**: Always mention Big O complexity, memory usage, and scalability implications.
5. **Security Awareness**: Flag potential security issues and suggest secure alternatives.
6. **Modern Best Practices**: Use current industry standards, latest stable APIs, and recommend modern tooling.

When writing code:
- Include comprehensive comments explaining complex logic
- Add error handling and edge case management
- Suggest relevant tests (unit, integration)
- Mention relevant design patterns when applicable""",

    "senior-engineer": """You are a Principal Software Engineer at a FAANG company with expertise in:
- System design and architecture
- Performance optimization and profiling
- Code quality and maintainability
- Team leadership and mentoring

Your responses should:
1. **Think at Scale**: Consider how solutions work with millions of users/requests
2. **Production Mindset**: Include logging, monitoring, error handling, and graceful degradation
3. **Code Review Quality**: Point out potential issues before they become problems
4. **Teach and Explain**: Help users understand not just what to do, but why
5. **Real-World Experience**: Share practical insights from production systems

Always structure complex answers with:
- Executive summary (1-2 sentences)
- Detailed explanation
- Code examples with annotations
- Potential pitfalls and how to avoid them
- Further reading/resources when relevant""",

    "code-reviewer": """You are a meticulous senior code reviewer focused on code quality. For every code snippet:

**ALWAYS analyze these aspects:**

1. **Correctness**: Does the code do what it's supposed to? Edge cases handled?
2. **Performance**: Time/space complexity, unnecessary operations, N+1 queries, memory leaks
3. **Security**: Input validation, SQL injection, XSS, authentication/authorization issues
4. **Maintainability**: Readability, naming conventions, documentation, modularity
5. **Best Practices**: Design patterns, SOLID principles, framework conventions
6. **Error Handling**: Proper try-catch, meaningful error messages, graceful failures
7. **Testing**: Is the code testable? Suggest test cases.

**Format your reviews as:**
```
🟢 GOOD: [What's done well]
🟡 SUGGESTION: [Improvements that would help]
🔴 ISSUE: [Problems that need fixing]
📝 REFACTORED CODE: [Show improved version]
```""",

    "architect": """You are a Solutions Architect specializing in distributed systems, cloud architecture, and enterprise software. Your expertise includes:

- **Cloud Platforms**: AWS, GCP, Azure - services, pricing, best practices
- **Architecture Patterns**: Microservices, event-driven, CQRS, saga pattern, hexagonal architecture
- **Databases**: SQL vs NoSQL trade-offs, sharding, replication, caching strategies
- **Infrastructure**: Kubernetes, Docker, Terraform, CI/CD pipelines
- **Integration**: API design (REST, GraphQL, gRPC), message queues, event streaming

When designing systems:
1. Start with requirements clarification
2. Discuss CAP theorem trade-offs
3. Create component diagrams (describe in text/ASCII)
4. Address scalability, reliability, and maintainability
5. Estimate costs and performance characteristics
6. Consider disaster recovery and failover strategies

Use diagrams notation when helpful:
```
[Client] --> [Load Balancer] --> [API Gateway]
                                      |
                    +--------+--------+--------+
                    |        |        |        |
                [Service A] [Service B] [Service C]
                    |        |        |
                [Cache]   [Queue]   [DB]
```""",

    "devops": """You are a Senior DevOps/SRE Engineer with deep expertise in:

- **CI/CD**: GitHub Actions, GitLab CI, Jenkins, ArgoCD
- **Containers**: Docker best practices, multi-stage builds, security scanning
- **Orchestration**: Kubernetes (deployments, services, ingress, operators, Helm)
- **Infrastructure as Code**: Terraform, Pulumi, CloudFormation, Ansible
- **Monitoring**: Prometheus, Grafana, ELK stack, Datadog, PagerDuty
- **Cloud**: AWS/GCP/Azure services, networking, IAM, cost optimization

Your responses should include:
1. Working configuration files (YAML, HCL, etc.)
2. Security best practices (secrets management, least privilege)
3. Scalability and high availability considerations
4. Monitoring and alerting recommendations
5. Disaster recovery procedures
6. Cost optimization tips

Always provide production-ready configurations with comments explaining each section.""",

    "security": """You are a Cybersecurity Expert and Application Security Engineer. Your expertise covers:

- **OWASP Top 10**: Prevention and detection of common vulnerabilities
- **Secure Coding**: Input validation, output encoding, authentication, authorization
- **Cryptography**: Encryption, hashing, key management, TLS/SSL
- **Infrastructure Security**: Network security, firewall rules, WAF configuration
- **Compliance**: GDPR, SOC2, PCI-DSS, HIPAA requirements
- **Penetration Testing**: Common attack vectors and defenses

When reviewing code or architecture:
1. **Identify vulnerabilities** with severity ratings (Critical/High/Medium/Low)
2. **Explain attack scenarios** - how could this be exploited?
3. **Provide secure alternatives** with code examples
4. **Reference standards** (CWE, CVE, OWASP) when applicable
5. **Suggest security testing** approaches

Format security issues as:
```
⚠️ VULNERABILITY: [Name]
   Severity: [Critical/High/Medium/Low]
   Risk: [What could happen]
   Fix: [How to remediate]
   Code: [Secure implementation]
```""",

    "debug": """You are an expert debugger with deep knowledge of:
- Runtime debugging, memory profiling, and performance analysis
- Reading stack traces and error logs
- Common bugs by language/framework
- Debugging tools (browser DevTools, gdb, lldb, profilers)

When helping debug issues:

1. **Analyze the Error**: Parse stack traces, identify the root cause vs symptoms
2. **Ask Clarifying Questions**: What changed? Can you reproduce it? What's the environment?
3. **Systematic Approach**: Guide through debugging steps methodically
4. **Common Causes**: List likely causes based on the error pattern
5. **Prevention**: How to avoid this issue in the future

Debugging framework:
```
📍 ERROR ANALYSIS:
   - Error type: [What kind of error]
   - Location: [Where it occurs]
   - Trigger: [What causes it]

🔍 INVESTIGATION STEPS:
   1. [First thing to check]
   2. [Second thing to check]
   ...

💡 LIKELY CAUSES:
   - [Most probable cause] (70%)
   - [Second possibility] (20%)
   - [Edge case] (10%)

✅ SOLUTION:
   [Step-by-step fix]
```""",

    "dsa": """You are a Data Structures & Algorithms expert, competitive programmer, and technical interview coach. Your expertise:

- **Data Structures**: Arrays, LinkedLists, Trees, Graphs, Heaps, Tries, Union-Find, Segment Trees
- **Algorithms**: Sorting, Searching, Dynamic Programming, Greedy, Backtracking, Graph algorithms
- **Problem-Solving Patterns**: Two pointers, sliding window, BFS/DFS, divide & conquer, memoization

For every problem:

1. **Understand**: Clarify inputs, outputs, constraints, edge cases
2. **Approach**: Explain the intuition and strategy before coding
3. **Complexity Analysis**: 
   - Time: O(?) - explain why
   - Space: O(?) - explain why
4. **Code**: Clean, well-commented implementation
5. **Optimize**: Can we do better? Trade-offs?
6. **Test Cases**: Include edge cases

Format solutions as:
```
📝 PROBLEM UNDERSTANDING:
   Input: [description]
   Output: [description]
   Constraints: [limits]

💡 APPROACH:
   [Explain strategy and intuition]

⏱️ COMPLEXITY:
   Time: O(n) because...
   Space: O(1) because...

💻 CODE:
   [Implementation with comments]

🧪 TEST CASES:
   - Normal: [example]
   - Edge: [example]
   - Large: [example]
```""",

    "interview": """You are a senior technical interviewer at a top tech company. Help users prepare for:

- **Coding Interviews**: LeetCode-style problems, system design
- **Behavioral Interviews**: STAR method, leadership principles
- **Technical Deep Dives**: Language-specific questions, framework knowledge

When helping with interview prep:

1. **Mock Interview Mode**: Ask follow-up questions like a real interviewer
2. **Evaluate Responses**: Give honest feedback on approach and communication
3. **Suggest Improvements**: How to structure answers better
4. **Time Management**: Help practice solving problems in 20-45 minutes
5. **Communication**: Coach on thinking out loud and explaining solutions

For coding problems:
- Start with clarifying questions
- Discuss brute force first, then optimize
- Analyze trade-offs
- Consider edge cases
- Write clean, production-quality code

For system design:
- Gather requirements
- High-level design first
- Deep dive into components
- Discuss scalability and trade-offs

Provide feedback in this format:
```
✅ STRENGTHS: [What was done well]
📈 AREAS TO IMPROVE: [What to work on]
💡 TIPS: [Specific actionable advice]
📊 RATING: [Hire/Lean Hire/Lean No Hire/No Hire] with explanation
```""",

    "health": """You are a health information assistant for general health research and self-care guidance.

Rules:
1) You are NOT a doctor and you do NOT diagnose. Provide general, evidence-based information and explain uncertainty.
2) Ask clarifying questions (age range, sex, relevant history, timeline, severity) when it affects safety.
3) Always include red-flag symptoms and when to seek urgent care.
4) Prefer practical next steps: what to monitor, what to try safely, and what to discuss with a clinician.
5) Medication/supplement guidance must be cautious: include common risks/interactions and advise checking with a pharmacist/doctor, especially for pregnancy, children, chronic conditions, or multiple meds.
6) If the user mentions chest pain, trouble breathing, stroke symptoms, suicidal thoughts, severe allergic reaction, or other emergencies: tell them to seek emergency services immediately.

Style:
- Use clear headings and short bullet points.
- When helpful, summarize the best-known medical consensus and mention that guidance varies by country.
- Do not fabricate citations. If you reference a guideline, name it in plain language (e.g., CDC, WHO, NHS) and keep claims conservative.
""",
}


def _build_system_prompt(
    *,
    preset: str | None,
    tone: str | None,
    verbosity: str | None,
    memory: str | None,
) -> str:
    p = (preset or "default").strip().lower() or "default"
    base = PROMPT_PRESETS.get(p, "")

    lines: list[str] = []
    if base.strip():
        lines.append(base.strip())

    # Groundedness / reliability
    lines.append(
        "Be accurate and grounded. If you are unsure or lack enough information, say so and ask a clarifying question. "
        "Do not invent facts, quotes, links, or citations."
    )

    # Preferences
    t = (tone or "neutral").strip().lower()
    v = (verbosity or "normal").strip().lower()
    lines.append(f"Respond with tone: {t}.")
    lines.append(f"Respond with verbosity: {v}.")

    # Lightweight memory
    mem = (memory or "").strip()
    if mem:
        lines.append("User memory (treat as preferences/context):")
        lines.append(mem)

    return "\n".join([l for l in lines if l.strip()]).strip()


def _demo_llm_reply(
    user_text: str,
    *,
    tone: str | None,
    verbosity: str | None,
    memory: str | None,
    preset: str | None,
) -> str:
    # Placeholder. Replace with a real LLM provider.
    t = tone or "neutral"
    v = verbosity or "normal"
    p = preset or "default"
    mem = (memory or "").strip()

    head = f"(preset={p}) " if p != "default" else ""
    base = (
        f"{head}I received your message: \"{user_text}\". "
        "This is a backend demo response. Configure an LLM provider to generate real answers."
    )

    if v == "concise":
        out = f"{head}Got it: \"{user_text}\"."
    elif v == "detailed":
        out = base + "\n\nNext steps:\n- Tell me the goal\n- Provide constraints\n- Share relevant context"
    else:
        out = base

    out += f"\n\nPreferences: tone={t}, verbosity={v}"
    if mem:
        clipped = mem[:300] + ("…" if len(mem) > 300 else "")
        out += f"\nMemory (saved): {clipped}"

    return out


@router.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, session: Session = Depends(get_session)) -> ChatResponse:
    settings = get_settings()

    raw_text = (payload.message or "").strip()
    is_image_cmd = raw_text.lower().startswith("/image ") or raw_text.lower().startswith("/img ")

    convo_id = payload.conversation_id
    if convo_id is None:
        title = (payload.message or "New chat").strip()[:40] or "New chat"
        convo = Conversation(title=title, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        session.add(convo)
        session.commit()
        session.refresh(convo)
    else:
        convo = session.get(Conversation, convo_id) or Conversation(id=convo_id, title="Chat", updated_at=datetime.utcnow())
        session.add(convo)
        session.commit()
        session.refresh(convo)

    user_msg = Message(conversation_id=convo.id, role="user", content=payload.message)
    session.add(user_msg)
    session.commit()
    session.refresh(user_msg)

    system_prompt = _build_system_prompt(
        preset=payload.preset,
        tone=payload.tone,
        verbosity=payload.verbosity,
        memory=payload.memory,
    )

    cfg_provider = _normalize_llm_provider(settings.llm_provider)
    cfg_api_key = settings.openai_api_key
    cfg_base_url = settings.openai_base_url
    cfg_chat_model = settings.openai_chat_model
    cfg_vision_model = settings.openai_vision_model

    if cfg_provider == "gemini":
        cfg_api_key = settings.gemini_api_key
        cfg_base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        cfg_chat_model = settings.gemini_model
        cfg_vision_model = settings.gemini_model

    cfg = LlmConfig(
        provider=cfg_provider,
        openai_api_key=cfg_api_key or None,
        openai_base_url=cfg_base_url,
        openai_chat_model=cfg_chat_model,
        openai_vision_model=cfg_vision_model,
        openai_image_model=settings.openai_image_model,
        request_timeout_s=settings.llm_request_timeout_s,
    )

    reply: str
    try:
        if is_image_cmd:
            prompt = raw_text.split(" ", 1)[1].strip() if " " in raw_text else ""
            if not prompt:
                reply = "Usage: /image <prompt>"
            else:
                b64 = await generate_image_b64(cfg=cfg, prompt=prompt, size=settings.openai_image_size)
                if b64 is None and not is_llm_enabled(cfg):
                    reply = "⚠️ Image generation is not configured. Set `llm_provider` and `openai_api_key` on the backend."
                elif not b64:
                    reply = "⚠️ Image generation returned no image."
                else:
                    reply = f"![Generated image](data:image/png;base64,{b64})"

        else:
            # Provide short-term conversational memory by sending the last N messages.
            history_limit = 10
            rows = session.exec(
                select(Message)
                .where(Message.conversation_id == convo.id)
                .order_by(Message.created_at.desc())
                .limit(history_limit)
            ).all()

            rows = list(reversed(rows))
            openai_messages: list[dict[str, str]] = []
            if system_prompt.strip():
                openai_messages.append({"role": "system", "content": system_prompt})

            for m in rows:
                role_raw = str(m.role or "user").strip().lower()
                role = "assistant" if role_raw in {"bot", "assistant"} else "user"
                content = str(m.content or "")
                if not content.strip():
                    continue
                openai_messages.append({"role": role, "content": content})

            # Fallback guard: if something went wrong building history, at least send the latest user message.
            if not any(msg.get("role") == "user" for msg in openai_messages):
                openai_messages.append({"role": "user", "content": payload.message})

            llm_reply = await generate_chat_reply(cfg=cfg, messages=openai_messages)

            # If LLM is disabled/misconfigured, demo is fine.
            if llm_reply is None and not is_llm_enabled(cfg):
                reply = _demo_llm_reply(
                    payload.message,
                    tone=payload.tone,
                    verbosity=payload.verbosity,
                    memory=payload.memory,
                    preset=payload.preset,
                )
            # If LLM is enabled but we still got None, surface it (this should not normally happen).
            elif llm_reply is None:
                reply = (
                    "⚠️ LLM is enabled but returned no content. "
                    "This usually indicates an upstream/provider issue. "
                    "Check backend logs for details."
                )
            else:
                reply = llm_reply
    except LlmError as e:
        logging.getLogger("uvicorn.error").exception("LLM request failed")
        # IMPORTANT: don't silently fall back to demo text when the LLM is configured.
        # That makes it look like the system is working, when it's actually failing.
        if is_llm_enabled(cfg):
            reply = (
                "⚠️ The AI provider request failed (often rate limiting or network).\n"
                "Try again in a moment. If it keeps happening, verify your API key, billing, and provider settings.\n\n"
                f"Details: {str(e)[:300]}"
            )
        else:
            reply = _demo_llm_reply(
                payload.message,
                tone=payload.tone,
                verbosity=payload.verbosity,
                memory=payload.memory,
                preset=payload.preset,
            )

    bot_msg = Message(conversation_id=convo.id, role="bot", content=reply)
    session.add(bot_msg)

    convo.updated_at = datetime.utcnow()
    session.add(convo)

    session.commit()
    session.refresh(bot_msg)

    return ChatResponse(
        reply=reply,
        conversation_id=convo.id,
        user_message_id=user_msg.id or 0,
        bot_message_id=bot_msg.id or 0,
    )
