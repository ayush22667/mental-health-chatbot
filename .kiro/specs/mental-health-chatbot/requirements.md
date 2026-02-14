# Requirements: Mental Health Support Chatbot

## 1. Product Overview

A between-session mental health support chatbot that provides evidence-based coping strategies, psychoeducation, and crisis detection with strict safety boundaries. The system is NOT a therapist and does not provide diagnosis or treatment.

## 2. Target Users and Context

### 2.1 Primary Users
- Individuals in ongoing therapy seeking between-session support
- People waiting for therapy appointments
- Campus counseling service users
- Employee wellness program participants
- Age range: 18+ (adult-focused initially)
- Geographic focus: India

### 2.2 Secondary Users
- Therapists/clinicians reviewing flagged sessions
- Care coordinators managing escalations
- Wellness program administrators

### 2.3 Use Context
- Responsive web application (mobile-friendly, not a native app)
- Low-bandwidth friendly (text-based, minimal assets for Indian internet conditions)
- English and Hindi initially, with multilingual expansion plan (Tamil, Telugu, Bengali, Marathi)
- Asynchronous use (not real-time emergency response)
- India-specific crisis resources and cultural context

### 2.4 Typical User Journeys
1. "I'm feeling anxious right now" → Grounding exercise
2. "I had a panic episode yesterday" → Psychoeducation + reflection
3. "I'm not sleeping well" → Sleep hygiene guidance
4. "I'm having thoughts of self-harm" → Crisis protocol activation

## 3. Problems to Solve

### 3.1 In-Scope
- Between-session support with CBT/ACT-based exercises
- Grounding techniques (5-4-3-2-1, breathing, progressive muscle relaxation)
- Psychoeducation on anxiety, depression, stress, panic, sleep
- Mood check-ins and journaling prompts
- Habit support (sleep hygiene, breathing practice reminders)
- Next-step guidance (non-clinical encouragement to reach out)

### 3.2 Out-of-Scope (Must Explicitly Reject)
- Diagnosis ("You have depression/PTSD/bipolar disorder")
- Medication advice or changes
- Replacing therapy or professional treatment
- Emergency response as sole support mechanism
- High-stakes medical guidance
- Trauma processing or exposure therapy
- Relationship counseling or couples therapy

## 4. Functional Requirements

### 4.1 Core Chat Features

**FR-1: Conversational Support**
- Empathetic, warm tone without therapeutic claims
- Clear boundaries ("I'm not a therapist, but I can help with...")
- Context-aware responses based on conversation history

**FR-2: Session Modes**
- Quick Calm (2-5 min): Immediate grounding techniques
- Guided Exercise (5-15 min): Structured CBT/ACT exercises
- Reflection/Journaling: Prompted self-reflection
- Education: Explain mental health concepts in simple language

**FR-3: Personalization**
- User preferences: tone (formal/casual), language
- Goals: stress management, sleep improvement, anxiety reduction
- Triggers (optional, user-controlled): topics to avoid
- Progress tracking: mood trends, exercise completion

### 4.2 Safety & Escalation System

**FR-4: Tiered Risk Detection**

**Risk Level 0: Normal**
- Signals: General stress, mild anxiety, everyday concerns
- Response: Provide exercises, education, journaling prompts
- Examples: "I'm stressed about work", "I feel a bit down today"

**Risk Level 1: Elevated Distress**
- Signals:
  - Panic language ("I can't breathe", "everything is falling apart")
  - Severe anxiety ("I can't stop worrying", "I'm terrified")
  - Hopelessness ("nothing will get better", "I feel empty")
  - Sleep/eating disruption lasting weeks
- Response:
  - Provide immediate grounding techniques
  - Encourage reaching out to trusted person or professional
  - Suggest contacting their therapist if in treatment
  - Offer crisis resources as reference
- Allowed: "It sounds like you're going through a really difficult time. Let's try a grounding exercise together, and I'd also encourage you to reach out to your therapist or a trusted person."
- Never: Minimize feelings or provide false reassurance

**Risk Level 2: Crisis**
- Signals:
  - Self-harm ideation ("I want to hurt myself", "I'm thinking about ending my life")
  - Suicide plan or intent ("I have pills", "I'm going to...")
  - Harm to others ("I want to hurt someone")
  - Abuse disclosure (current danger)
  - Severe dissociation or psychosis indicators
- Response:
  - STOP normal conversational flow immediately
  - Present crisis resources prominently (KIRAN Helpline 1800-599-0019, Vandrevala Foundation +91 9999 666 555)
  - Encourage contacting emergency services (112) if imminent danger
  - Trigger escalation to human counselor (if system integrated)
  - Avoid prolonged back-and-forth or debate
  - Log event for review (de-identified)
- Allowed: "I'm really concerned about your safety. Please contact the KIRAN Mental Health Helpline right now at 1800-599-0019 (toll-free, 24/7), or call 112 if you're in immediate danger. I'm not equipped to provide emergency support, but these services are."
- Never: Engage in extended crisis counseling, promise confidentiality in danger situations, or continue normal chat

**FR-5: Crisis Resource Database**
- India: 
  - KIRAN Mental Health Helpline: 1800-599-0019 (24/7, toll-free)
  - Vandrevala Foundation: +91 9999 666 555
  - iCall (TISS): +91 9152987821 (Mon-Sat, 8 AM - 10 PM)
  - Sneha India Foundation: +91 44 2464 0050 (24/7)
  - Emergency: 112 (National Emergency Number)
- Specialized resources (LGBTQ+, women, youth)
- State-specific helplines where available

**FR-6: Escalation Triggers**
- Automatic: Risk Level 2 detection
- Manual: User requests human support
- System: Repeated Risk Level 1 in short timeframe (3+ in 24 hours)

### 4.3 Data Logging & Privacy

**FR-7: Privacy Controls**
- Minimal data retention by default (30-day rolling window)
- User consent required for saving reflections/journal entries
- Export conversation history (JSON/PDF)
- Delete account and all data option
- Clear privacy notice on first use

**FR-8: Audit Logging**
- Safety events logged (risk level, timestamp, action taken)
- No full conversation storage without consent
- De-identified logs for safety review
- Compliance with HIPAA considerations (if applicable)

### 4.4 Educational Content

**FR-9: Psychoeducation Library**
- Topics: anxiety, depression, panic, stress, sleep, grounding techniques
- Sources: WHO, NIMH, APA public resources, peer-reviewed summaries
- Citations included for all educational claims
- Readability: 8th-grade level or below

**FR-10: Exercise Library**
- CBT: Cognitive restructuring, thought records, behavioral activation
- ACT: Defusion, values clarification, acceptance
- Grounding: 5-4-3-2-1, box breathing, progressive muscle relaxation
- Sleep hygiene: Evidence-based recommendations

## 5. Non-Functional Requirements

**NFR-1: Safety First**
- Conservative behavior: refuse when uncertain
- Refusal patterns for out-of-scope requests
- No hallucinated medical information

**NFR-2: Performance**
- Response time: <3 seconds for 95th percentile
- Mobile-friendly: works on 3G connections
- Offline mode: cached exercises available

**NFR-3: Availability**
- 99.5% uptime target
- Graceful degradation if LLM unavailable

**NFR-4: Observability**
- Real-time safety event monitoring
- Response quality metrics
- User satisfaction tracking (optional feedback)

**NFR-5: Accessibility**
- WCAG 2.1 AA compliance
- Screen reader compatible
- Simple language option
- High contrast mode

**NFR-6: Internationalization**
- Phase 1: English and Hindi
- Phase 2: Tamil, Telugu, Bengali, Marathi
- Cultural adaptation of exercises and resources for Indian context
- Consideration of Indian cultural values and family dynamics

## 6. Data Strategy

### 6.1 Public Data Sources

**Educational Content:**
- WHO mental health fact sheets
- NIMHANS (National Institute of Mental Health and Neuro Sciences, Bangalore) public resources
- Indian Psychiatric Society public articles
- Ministry of Health and Family Welfare (India) mental health resources
- TISS (Tata Institute of Social Sciences) iCall resources
- Public mental health awareness materials from Indian NGOs

**Synthetic Conversation Data:**
- Generated using diverse personas (age, gender, cultural background, mental health concerns)
- Scenarios covering Risk Levels 0-2
- Balanced representation (not skewed toward crisis)
- Red-team adversarial examples

**Public Benchmark Datasets (if appropriate):**
- Counseling and Psychotherapy Transcripts (if publicly available and ethically sourced)
- Reddit Mental Health Corpus (r/depression, r/anxiety - public posts only, anonymized)
- Note: Use only for evaluation, not training

### 6.2 Dataset Risks & Mitigation

**Risks:**
- Bias toward Western mental health models (not culturally appropriate for India)
- Under-representation of Indian regional and socioeconomic diversity
- Stigmatizing language in historical data
- Crisis detection false negatives
- Language and dialect variations across India

**Mitigation:**
- Diverse synthetic persona generation (50+ profiles representing Indian demographics)
- Cultural consultation with Indian mental health professionals
- Adaptation of CBT/ACT techniques for Indian cultural context
- Bias audits on crisis detection (test across Indian demographics, languages, regions)
- Regular red-team testing with Indian mental health professionals
- Consideration of family dynamics and collectivist values in Indian culture

### 6.3 Explicit Constraints
- NO real patient data
- NO scraping of private mental health forums
- NO use of data without clear public license

## 7. Acceptance Criteria

### 7.1 Safety Criteria (Must Pass)
- AC-1: System detects 100% of explicit self-harm statements in test set (zero false negatives allowed)
- AC-2: System refuses diagnosis requests 100% of the time
- AC-3: System refuses medication advice 100% of the time
- AC-4: Crisis resources displayed within 2 seconds of Risk Level 2 detection
- AC-5: No therapeutic claims made in any response

### 7.2 Quality Criteria
- AC-6: Educational content includes citations 100% of the time
- AC-7: Responses maintain empathetic tone (validated by clinician review)
- AC-8: Readability score ≤8th grade level for educational content
- AC-9: User can export/delete data successfully

### 7.3 Performance Criteria
- AC-10: 95th percentile response time <3 seconds
- AC-11: System available 99.5% of time (measured monthly)
- AC-12: Mobile-friendly on devices with 3G connection

## 8. Limitations & Disclaimers

### 8.1 System Limitations
- NOT medical advice or professional mental health treatment
- NOT a replacement for therapy, counseling, or psychiatric care
- NOT equipped for emergency crisis response (directs to KIRAN 1800-599-0019 / 112)
- Model may produce errors, hallucinations, or biased responses
- Trained on synthetic/public data (may not generalize to all individuals)
- English-only initially (cultural context limited)

### 8.2 User Disclaimers (Shown on First Use)
"This chatbot provides educational information and coping strategies between therapy sessions. It is not a therapist and cannot diagnose, treat, or provide medical advice. In a crisis, contact KIRAN Mental Health Helpline at 1800-599-0019 (toll-free, 24/7) or call 112 for emergency services. By continuing, you acknowledge these limitations."

## 9. Success Metrics

### 9.1 Safety Metrics (Primary)
- Crisis detection recall: 100% (zero false negatives)
- Crisis detection precision: >80% (minimize false alarms)
- Escalation response time: <2 seconds

### 9.2 Quality Metrics
- User satisfaction: >4.0/5.0 (optional feedback)
- Clinician review score: >4.0/5.0 (appropriateness)
- Exercise completion rate: >60%

### 9.3 Engagement Metrics
- Return users: >40% within 7 days
- Average session length: 5-10 minutes
- Mood improvement (self-reported): >30% report feeling better post-session

## 10. Out of Scope for MVP

- Integration with EHR systems
- Video or voice interaction
- Group support features
- Therapist dashboard (Phase 2)
- Predictive risk modeling
- Medication reminders
- Insurance billing integration
- Additional languages beyond English and Hindi (Tamil, Telugu, Bengali, Marathi — Phase 2)
- Fine-tuned BERT crisis classifier (using LLM-based classification in MVP)
- WhatsApp integration (Phase 2, API designed channel-agnostic from MVP)
