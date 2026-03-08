import {
  RiskLevel,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
  ResponsePolicy,
  ResponseValidationRequest,
  ResponseValidationResponse,
  SafetyViolation,
  Language,
} from '../models';
import { config } from '../config';

export class SafetyService {
  // Crisis keywords by language
  private crisisKeywords = {
    en: [
      'suicide', 'kill myself', 'end my life', 'self-harm', 'hurt myself',
      'take my life', "don't want to live", 'no reason to live',
      "can't go on", 'give up', 'no point', 'want to die',
    ],
    hi: [
      'आत्महत्या', 'मरना चाहता हूं', 'जीना नहीं चाहता',
      'खुद को नुकसान', 'जीवन समाप्त करना',
    ],
    hinglish: [
      'mujhe mar jaana hai', 'main nahi reh sakta', 'zindagi nahi chahiye',
      'khud ko khatam karna', 'suicide karna hai',
    ],
  };

  /**
   * Assess risk level of a message
   */
  async assessRisk(
    request: RiskAssessmentRequest
  ): Promise<RiskAssessmentResponse> {
    const startTime = Date.now();

    // Stage 1: Keyword matching
    const keywordMatch = this.checkKeywords(request.message, request.language);

    if (keywordMatch.found) {
      // Immediate crisis classification
      return {
        riskLevel: RiskLevel.Crisis,
        riskScore: 1.0,
        triggeredKeywords: keywordMatch.keywords,
        classifierConfidence: 1.0,
        policy: this.getCrisisPolicy(),
      };
    }

    // Stage 2: ML Classifier (TODO: Integrate with SageMaker)
    // For now, return Normal
    const riskScore = 0.1; // Placeholder
    const riskLevel = this.getRiskLevelFromScore(riskScore);

    const elapsed = Date.now() - startTime;
    if (elapsed > config.safety.riskClassificationTimeoutMs) {
      console.warn(`Risk classification took ${elapsed}ms (threshold: ${config.safety.riskClassificationTimeoutMs}ms)`);
    }

    return {
      riskLevel,
      riskScore,
      classifierConfidence: 0.8,
      policy: this.getResponsePolicy(riskLevel),
    };
  }

  /**
   * Check for crisis keywords
   */
  private checkKeywords(
    message: string,
    language: Language
  ): { found: boolean; keywords: string[] } {
    const messageLower = message.toLowerCase();
    const keywords = this.crisisKeywords[language] || this.crisisKeywords.en;
    const found: string[] = [];

    for (const keyword of keywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }

    return {
      found: found.length > 0,
      keywords: found,
    };
  }

  /**
   * Get risk level from score
   */
  private getRiskLevelFromScore(score: number): RiskLevel {
    if (score >= config.safety.crisisThreshold) {
      return RiskLevel.Crisis;
    } else if (score >= config.safety.elevatedThreshold) {
      return RiskLevel.Elevated;
    } else {
      return RiskLevel.Normal;
    }
  }

  /**
   * Get response policy for risk level
   */
  private getResponsePolicy(riskLevel: RiskLevel): ResponsePolicy {
    switch (riskLevel) {
      case RiskLevel.Crisis:
        return this.getCrisisPolicy();
      case RiskLevel.Elevated:
        return {
          allowNormalResponse: true,
          insertCheckIn: true,
          displayCrisisResources: false,
          disableChatInput: false,
          triggerEscalation: false,
        };
      case RiskLevel.Normal:
      default:
        return {
          allowNormalResponse: true,
          insertCheckIn: false,
          displayCrisisResources: false,
          disableChatInput: false,
          triggerEscalation: false,
        };
    }
  }

  /**
   * Get crisis response policy
   */
  private getCrisisPolicy(): ResponsePolicy {
    return {
      allowNormalResponse: false,
      insertCheckIn: false,
      displayCrisisResources: true,
      disableChatInput: true,
      triggerEscalation: true,
    };
  }

  /**
   * Validate response for safety violations
   */
  async validateResponse(
    request: ResponseValidationRequest
  ): Promise<ResponseValidationResponse> {
    const startTime = Date.now();
    const violations: SafetyViolation[] = [];

    // Check for medical diagnosis
    if (this.containsMedicalDiagnosis(request.response)) {
      violations.push(SafetyViolation.MedicalDiagnosis);
    }

    // Check for medication advice
    if (this.containsMedicationAdvice(request.response)) {
      violations.push(SafetyViolation.MedicationAdvice);
    }

    // Check for therapeutic claims
    if (this.containsTherapeuticClaim(request.response)) {
      violations.push(SafetyViolation.TherapeuticClaim);
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > config.safety.filterTimeoutMs) {
      console.warn(`Safety filter took ${elapsed}ms (threshold: ${config.safety.filterTimeoutMs}ms)`);
    }

    if (violations.length > 0) {
      // Log violation
      console.warn('Safety violation detected:', violations);

      return {
        isValid: false,
        violations,
        replacementResponse: this.getRefusalTemplate(violations[0], request.language),
      };
    }

    return {
      isValid: true,
      violations: [],
    };
  }

  /**
   * Check for medical diagnosis language
   */
  private containsMedicalDiagnosis(response: string): boolean {
    const patterns = [
      /you have (clinical )?(depression|anxiety|bipolar|schizophrenia|ptsd)/i,
      /you are suffering from/i,
      /this is (a case of|clearly)/i,
      /you've been diagnosed with/i,
    ];

    return patterns.some(pattern => pattern.test(response));
  }

  /**
   * Check for medication advice
   */
  private containsMedicationAdvice(response: string): boolean {
    const patterns = [
      /you should take/i,
      /stop taking (your )?(medication|meds)/i,
      /(increase|decrease) (your )?dosage/i,
      /(sertraline|prozac|zoloft|xanax|lexapro)/i,
    ];

    return patterns.some(pattern => pattern.test(response));
  }

  /**
   * Check for therapeutic claims
   */
  private containsTherapeuticClaim(response: string): boolean {
    const patterns = [
      /I can cure/i,
      /this will (definitely )?fix/i,
      /guaranteed to help/i,
      /I can treat/i,
    ];

    return patterns.some(pattern => pattern.test(response));
  }

  /**
   * Get refusal template for violation
   */
  private getRefusalTemplate(violation: SafetyViolation, language: Language): string {
    const templates = {
      [SafetyViolation.MedicalDiagnosis]: {
        en: "I can't diagnose mental health conditions. If you're concerned about specific symptoms, please consult a licensed mental health professional or your doctor.",
        hi: "मैं मानसिक स्वास्थ्य स्थितियों का निदान नहीं कर सकता। यदि आप विशिष्ट लक्षणों के बारे में चिंतित हैं, तो कृपया एक लाइसेंस प्राप्त मानसिक स्वास्थ्य पेशेवर या अपने डॉक्टर से परामर्श करें।",
        hinglish: "Main mental health conditions diagnose nahi kar sakta. Agar aap specific symptoms ke baare mein worried hain, toh please ek licensed mental health professional ya apne doctor se consult karein.",
      },
      [SafetyViolation.MedicationAdvice]: {
        en: "I can't provide medication advice. Please consult your prescribing doctor or psychiatrist for any questions about medications.",
        hi: "मैं दवा की सलाह नहीं दे सकता। दवाओं के बारे में किसी भी प्रश्न के लिए कृपया अपने निर्धारित डॉक्टर या मनोचिकित्सक से परामर्श करें।",
        hinglish: "Main medication advice nahi de sakta. Medicines ke baare mein kisi bhi question ke liye please apne prescribing doctor ya psychiatrist se consult karein.",
      },
      [SafetyViolation.TherapeuticClaim]: {
        en: "These are general coping strategies that many people find helpful. For personalized treatment, please work with a licensed therapist.",
        hi: "ये सामान्य मुकाबला रणनीतियाँ हैं जो कई लोगों को सहायक लगती हैं। व्यक्तिगत उपचार के लिए, कृपया एक लाइसेंस प्राप्त चिकित्सक के साथ काम करें।",
        hinglish: "Ye general coping strategies hain jo kai logon ko helpful lagti hain. Personalized treatment ke liye, please ek licensed therapist ke saath kaam karein.",
      },
      [SafetyViolation.IdentifiableMedicalInfo]: {
        en: "I notice you've shared specific medical information. For your privacy, I won't store those details. Let's focus on coping strategies I can help with.",
        hi: "मैंने देखा कि आपने विशिष्ट चिकित्सा जानकारी साझा की है। आपकी गोपनीयता के लिए, मैं उन विवरणों को संग्रहीत नहीं करूंगा। आइए उन मुकाबला रणनीतियों पर ध्यान केंद्रित करें जिनमें मैं मदद कर सकता हूं।",
        hinglish: "Maine dekha ki aapne specific medical information share ki hai. Aapki privacy ke liye, main un details ko store nahi karunga. Chaliye un coping strategies par focus karein jinmein main help kar sakta hoon.",
      },
    };

    return templates[violation][language] || templates[violation].en;
  }


    /**
     * Assess risk for voice conversation context
     * Returns crisis indicator and resources for Nova Sonic tool response
     */
    async assessVoiceRisk(
      message: string,
      language: Language,
      conversationHistory: any[] = []
    ): Promise<{
      riskLevel: RiskLevel;
      riskScore: number;
      crisisResources?: {
        kiran: string;
        vandrevala: string;
        emergency: string;
      };
      preventAudioGeneration: boolean;
    }> {
      // Use existing risk assessment
      const assessment = await this.assessRisk({
        message,
        conversationHistory,
        language,
      });

      // If crisis detected, return crisis resources
      if (assessment.riskLevel === RiskLevel.Crisis) {
        return {
          riskLevel: RiskLevel.Crisis,
          riskScore: assessment.riskScore,
          crisisResources: {
            kiran: '1800-599-0019',
            vandrevala: '+91 9999 666 555',
            emergency: '112',
          },
          preventAudioGeneration: true, // Stop audio generation for crisis
        };
      }

      return {
        riskLevel: assessment.riskLevel,
        riskScore: assessment.riskScore,
        preventAudioGeneration: false,
      };
    }

}
