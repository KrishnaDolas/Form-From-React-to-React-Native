import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { Buffer } from "buffer";

const API_URL = "http://192.168.56.1:5000";

// Types (kept simple for readability)
type Question = {
  id?: number;
  text: string;
  type: "single" | "multiple" | "numeric" | "file" | "dropdown";
  options?: { value: string }[];
  mandatory?: boolean;
  section: string;
};

type Condition = {
  question: string;
  operator: "==" | "!=" | "<=" | ">=" | "<" | ">";
  value: any;
  logicOp?: "AND" | "OR"; // used to combine with previous condition
};

type LogicRule = {
  question: string; // main question text
  conditions: Condition[];
  action: { type: "show" | "hide" | "skip"; target?: string };
  // fallback
  followUpQuestion?: string;
};

export default function SurveyScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // answers store: { [questionText]: { questionText, value, type, section, questionId } }
  const [answers, setAnswers] = useState<Record<string, any>>({});
  // visibleFollowUps maps follow-up question text -> boolean (visible or not)
  const [visibleFollowUps, setVisibleFollowUps] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
  try {
    console.log("Starting fetchTemplate...");
    const url = `${API_URL}/api/templates/${id}`;
    console.log("Fetching template from URL:", url);
    const res = await axios.get(url);
    console.log("Received response:", res.data);

    // normalize options
    const questions = res.data.questions || [];
    console.log("Original questions:", questions);

    const normalizedQuestions: Question[] = questions.map((q: Question) => {
      console.log("Processing question:", q);
      const options = q.options?.map((opt: any) =>
        typeof opt === "string" ? { value: opt } : opt
      ) || [];
      console.log("Normalized options for question:", options);
      return {
        ...q,
        options,
      };
    });

    console.log("Normalized questions:", normalizedQuestions);

    setTemplate({
      ...res.data,
      questions: normalizedQuestions,
      logicRules: res.data.logicRules || res.data.followUpRules || [],
    });
    console.log("Template state set successfully");
  } catch (err) {
    console.error("Fetch template error:", err);
    Alert.alert("Error", "Failed to load template");
  } finally {
    console.log("fetchTemplate completed, setting loading to false");
    setLoading(false);
  }
};

  // helper: evaluate a single condition against provided answers snapshot
  const evalSingleCondition = (cond: Condition, ansMap: Record<string, any>): boolean => {
    const raw = ansMap[cond.question]?.value;
    // If referenced question not answered yet -> do NOT pass the condition
    if (raw === undefined || raw === null || raw === "") {
  // explicitly mark as "not ready" so the whole rule won't trigger
  return false;
}


    // numeric comparisons
    if (["<", ">", "<=", ">="].includes(cond.operator)) {
      const a = Number(raw);
      const b = Number(cond.value);
      if (Number.isNaN(a) || Number.isNaN(b)) return false;
      switch (cond.operator) {
        case "<":
          return a < b;
        case ">":
          return a > b;
        case "<=":
          return a <= b;
        case ">=":
          return a >= b;
      }
    } else {
      // equality/inequality — compare as strings (exact)
      const aStr = String(raw);
      const bStr = String(cond.value);
      switch (cond.operator) {
        case "==":
          return aStr === bStr;
        case "!=":
          return aStr !== bStr;
      }
    }
    return false;
  };

  // Evaluate multiple conditions (combine using each cond's logicOp; default AND)
  const evaluateConditions = (conditions: Condition[], ansMap: Record<string, any>): boolean => {
    if (!conditions || conditions.length === 0) return false;
    let acc: boolean | null = null;
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      const singleMatch = evalSingleCondition(cond, ansMap);
      if (i === 0) {
        acc = singleMatch;
      } else {
        const op = cond.logicOp || "AND";
        if (op === "OR") acc = !!(acc || singleMatch);
        else acc = !!(acc && singleMatch);
      }
    }
    return !!acc;
  };

  // compute visibility map of follow-up targets using provided answers snapshot
 const computeVisibility = (ansSnapshot: Record<string, any>): Record<string, boolean> => {
  const rules: LogicRule[] = (template?.logicRules || []) as LogicRule[];
  const targetState: Record<string, { showMatched: boolean; hideMatched: boolean }> = {};

  rules.forEach((rule: LogicRule) => {
    const target = rule.action?.target || rule.followUpQuestion;
    if (!target) return;

    const condPass = evaluateConditions(rule.conditions || [], ansSnapshot);

    // 🚫 If ANY condition references an unanswered question → do not show
    const unanswered = rule.conditions.some((c) => {
      const val = ansSnapshot[c.question]?.value;
      return val === undefined || val === null || val === "";
    });
    if (unanswered) return; // skip this rule completely

    const actionType = rule.action?.type || "show";

    if (!targetState[target]) targetState[target] = { showMatched: false, hideMatched: false };

    if (actionType === "show" && condPass) {
      targetState[target].showMatched = true;
    }
    if (actionType === "hide" && condPass) {
      targetState[target].hideMatched = true;
    }
  });

  const visibility: Record<string, boolean> = {};
  Object.keys(targetState).forEach((t) => {
    if (targetState[t].hideMatched) visibility[t] = false;
    else visibility[t] = !!targetState[t].showMatched;
  });

  return visibility;
};


  // helper to check whether a question text is a follow-up target in any rule
  const isFollowUpQuestionText = (qText: string): boolean => {
    const rules: LogicRule[] = (template?.logicRules || []) as LogicRule[];
    return rules.some((r) => {
      const target = r.action?.target || r.followUpQuestion;
      return target === qText;
    });
  };

  // MAIN: setAnswer updates answers, computes visibility using the UPDATED answers snapshot,
  // clears answers for follow-ups that became hidden, and updates visibleFollowUps state.
  const setAnswer = (
    qText: string,
    value: any,
    type: Question["type"],
    section: string,
    idx: number
  ) => {
    setAnswers((prev) => {
      // build updated answers snapshot
      const updated: Record<string, any> = {
        ...prev,
        [qText]: { questionText: qText, value, type, section, questionId: idx },
      };

      // compute visibility using updated snapshot
      const visibility = template ? computeVisibility(updated) : {};

      // remove answers for follow-ups that are present in rules but are not visible now
      const cleaned = { ...updated };
      const allTargets: string[] = ((template?.logicRules || []) as LogicRule[])
        .map((r) => r.action?.target || r.followUpQuestion)
        .filter((t): t is string => !!t);

      allTargets.forEach((targetText: string) => {
        if (isFollowUpQuestionText(targetText) && !visibility[targetText]) {
          if (cleaned[targetText]) delete cleaned[targetText];
        }
      });

      // update visible follow ups state
      setVisibleFollowUps(visibility);

      // return cleaned answers as new state
      return cleaned;
    });
  };

  // image picker helpers (unchanged)
  const pickImage = async (qText: string, section: string, idx: number) => {
    Alert.alert("Upload Photo", "Choose an option", [
      {
        text: "Take Photo",
        onPress: async () => {
          const permissionCamera = await ImagePicker.requestCameraPermissionsAsync();
          if (!permissionCamera.granted) {
            Alert.alert("Permission required", "Please allow camera access.");
            return;
          }
          const result: ImagePicker.ImagePickerResult = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.7,
          });
          handleImageResult(result, qText, section, idx);
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          const permissionGallery = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permissionGallery.granted) {
            Alert.alert("Permission required", "Please allow photo access.");
            return;
          }
          const result: ImagePicker.ImagePickerResult = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            quality: 0.7,
          });
          handleImageResult(result, qText, section, idx);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleImageResult = async (
    result: ImagePicker.ImagePickerResult,
    qText: string,
    section: string,
    idx: number
  ) => {
    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];
    try {
      const response = await fetch(asset.uri);
      const buffer = await response.arrayBuffer();
      const base64data = `data:${asset.mimeType || "image/jpeg"};base64,${Buffer.from(buffer).toString("base64")}`;
      await axios.post(`${API_URL}/api/uploads`, { base64: base64data });
      setAnswer(qText, base64data, "file", section, idx);
    } catch (err) {
      console.error("Image upload error:", err);
      Alert.alert("Upload failed");
    }
  };

  // Submit remains the same (normalizes answers, validates mandatory)
  const handleSubmit = async () => {
    if (!template) return;

    const normalizedAnswers: Record<string, any> = {};
    Object.keys(answers).forEach((key) => {
      const val = answers[key]?.value;
      normalizedAnswers[key] = typeof val === "string" ? val.trim() : val;
    });

    const requiredQuestions = (template.questions as Question[]).filter((q: Question) => q.mandatory).map((q: Question) => q.text);

    // Build answer array in same order as questionnaire
    const answerArray = (template.questions as Question[])
      .map((q: Question) => ({
        ...answers[q.text],
        value: normalizedAnswers[q.text],
      }))
      .filter(Boolean);

    const missing = requiredQuestions.filter((qText: string) => !normalizedAnswers[qText]);
    if (missing.length > 0) {
      Alert.alert("Missing Answers", `Please answer:\n${missing.join("\n")}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/responses`, {
        templateId: id,
        answers: answerArray,
        meta: { userId: "demo-user" },
      });
      Alert.alert("Submitted", `Score: ${res.data.score ?? "N/A"}\nPassed: ${res.data.passed ?? "N/A"}`);
      router.back();
    } catch (err) {
      console.error("Submission error:", err);
      Alert.alert("Error", "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0b74ff" />
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.center}>
        <Text>Template not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{template.name}</Text>
        <Text style={styles.subtitle}>{template.description}</Text>
      </View>

      {/* Sections and questions */}
      {(template.sections || []).map((sec: any, i: number) => (
        <View key={i} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{sec.title}</Text>
          {sec.description && <Text style={styles.sectionDesc}>{sec.description}</Text>}

          {(template.questions || [])
            .filter((q: Question) => q.section === sec.title)
            .map((q: Question, j: number) => {
              const current = answers[q.text];

              // find rules where this question is the main trigger
              const rulesForThis: LogicRule[] = (template.logicRules || []).filter((r: LogicRule) => r.question === q.text);

              // followUp questions for this main question (but render only if visibleFollowUps[target] === true)
              const followUpsForThis = rulesForThis
                .map((r) => {
                  const target = r.action?.target || r.followUpQuestion;
                  return (template.questions || []).find((qq: Question) => qq.text === target);
                })
                .filter(Boolean) as Question[];

              return (
                <View key={j} style={styles.questionBlock}>
                  <Text style={styles.qText}>
                    {q.text} {q.mandatory && <Text style={{ color: "red" }}>*</Text>}
                  </Text>

                  {/* Single choice */}
                  {q.type === "single" &&
                    (q.options ?? []).map((opt: { value: string }, k: number) => (
                      <TouchableOpacity
                        key={k}
                        style={[styles.optButton, current?.value === opt.value && styles.optButtonActive]}
                        onPress={() => {
                          // save answer THEN compute & show follow-up (setAnswer handles visibility synchronously)
                          setAnswer(q.text, opt.value, "single", sec.title, j);
                        }}
                      >
                        <Text style={[styles.optText, current?.value === opt.value && styles.optTextActive]}>{opt.value}</Text>
                      </TouchableOpacity>
                    ))}

                  {/* Multiple choice */}
                  {q.type === "multiple" &&
                    (q.options ?? []).map((opt: { value: string }, k: number) => {
                      const selected = current && Array.isArray(current.value) && current.value.includes(opt.value);
                      return (
                        <TouchableOpacity
                          key={k}
                          style={[styles.optButton, selected && styles.optButtonActive]}
                          onPress={() => {
                            const arr = current?.value ? [...current.value] : [];
                            const newVal = arr.includes(opt.value) ? arr.filter((a: string) => a !== opt.value) : [...arr, opt.value];
                            setAnswer(q.text, newVal, "multiple", sec.title, j);
                          }}
                        >
                          <Text style={[styles.optText, selected && styles.optTextActive]}>{opt.value}</Text>
                        </TouchableOpacity>
                      );
                    })}

                  {/* Dropdown (rendered as options list for mobile simplicity) */}
                  {q.type === "dropdown" && (q.options?.length ?? 0) > 0 && (
                    <View style={styles.dropdown}>
                      {(q.options ?? []).map((opt: { value: string }, k: number) => (
                        <TouchableOpacity
                          key={k}
                          style={[styles.optButton, current?.value === opt.value && styles.optButtonActive]}
                          onPress={() => setAnswer(q.text, opt.value, "dropdown", sec.title, j)}
                        >
                          <Text style={[styles.optText, current?.value === opt.value && styles.optTextActive]}>{opt.value}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Numeric input */}
                  {q.type === "numeric" && (
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="Enter number"
                      value={current?.value ?? ""}
                      onChangeText={(t) => {
                        // update answer (will evaluate rules on each change)
                        setAnswer(q.text, t, "numeric", sec.title, j);
                      }}
                    />
                  )}

                  {/* File upload */}
                  {q.type === "file" && (
                    <View>
                      {current?.value && <Image source={{ uri: current.value }} style={styles.image} />}
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(q.text, sec.title, j)}>
                        <Text style={styles.uploadText}>📷 Upload Photo</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Render follow-ups for this main question only if visibility says true */}
                  {followUpsForThis.map((fq, idx) => {
                    if (!visibleFollowUps[fq.text]) return null; // do not render until checked and visible
                    const fqCurrent = answers[fq.text];
                    return (
                      <View key={idx} style={styles.followUp}>
                        <Text style={styles.qText}>{fq.text}</Text>

                        {fq.type === "single" &&
                          (fq.options ?? []).map((opt, k) => (
                            <TouchableOpacity
                              key={k}
                              style={[styles.optButton, fqCurrent?.value === opt.value && styles.optButtonActive]}
                              onPress={() => setAnswer(fq.text, opt.value, "single", sec.title, j + 100 + idx)}
                            >
                              <Text style={[styles.optText, fqCurrent?.value === opt.value && styles.optTextActive]}>{opt.value}</Text>
                            </TouchableOpacity>
                          ))}

                        {fq.type === "multiple" &&
                          (fq.options ?? []).map((opt, k) => {
                            const selected = fqCurrent?.value?.includes(opt.value);
                            return (
                              <TouchableOpacity
                                key={k}
                                style={[styles.optButton, selected && styles.optButtonActive]}
                                onPress={() => {
                                  const arr = fqCurrent?.value ? [...fqCurrent.value] : [];
                                  const newVal = arr.includes(opt.value) ? arr.filter((a: string) => a !== opt.value) : [...arr, opt.value];
                                  setAnswer(fq.text, newVal, "multiple", sec.title, j + 100 + idx);
                                }}
                              >
                                <Text style={[styles.optText, selected && styles.optTextActive]}>{opt.value}</Text>
                              </TouchableOpacity>
                            );
                          })}

                        {fq.type === "numeric" && (
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="Enter number"
                            value={fqCurrent?.value ?? ""}
                            onChangeText={(t) => setAnswer(fq.text, t, "numeric", sec.title, j + 100 + idx)}
                          />
                        )}

                        {fq.type === "file" && (
                          <View>
                            {fqCurrent?.value && <Image source={{ uri: fqCurrent.value }} style={styles.image} />}
                            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(fq.text, sec.title, j + 100 + idx)}>
                              <Text style={styles.uploadText}>📷 Upload Photo</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
        </View>
      ))}

      {/* Submit */}
      <TouchableOpacity style={[styles.submitBtn, submitting && { backgroundColor: "#ccc" }]} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? "Submitting..." : "Submit"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 16, backgroundColor: "#0b74ff" },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#e0e0e0", marginTop: 4 },
  sectionCard: {
    margin: 12,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0b3b72" },
  sectionDesc: { color: "#555", marginBottom: 8 },
  questionBlock: { marginTop: 12 },
  qText: { fontWeight: "600", marginBottom: 6 },
  optButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 6,
  },
  optButtonActive: { backgroundColor: "#0b74ff", borderColor: "#0b74ff" },
  optText: { color: "#333" },
  optTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  uploadBtn: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#0b74ff",
    borderRadius: 8,
    alignItems: "center",
  },
  dropdown: {
    marginTop: 8,
    marginBottom: 12,
  },
  uploadText: { color: "#fff", fontWeight: "600" },
  image: { width: 160, height: 100, borderRadius: 6, marginTop: 8 },
  submitBtn: {
    margin: 20,
    padding: 16,
    backgroundColor: "#34c759",
    borderRadius: 12,
    alignItems: "center",
  },
  followUp: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f9f9ff",
    borderLeftWidth: 3,
    borderLeftColor: "#0b74ff",
    borderRadius: 6,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
