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
import { Picker } from "@react-native-picker/picker";

const API_URLS = [
  "http://10.193.25.18:5000/api/templates",
  "http://192.168.56.1:5000/api/templates"
];

// Example: pick the first available one
const API_URL = API_URLS[0] || API_URLS[1];


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
  logicOp?: "AND" | "OR";
};

type LogicRule = {
  question: string;
  conditions: Condition[];
  action: { type: "show" | "hide"; target?: string };
};

export default function SurveyScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [visibleFollowUps, setVisibleFollowUps] = useState<
    Record<string, boolean>
  >({});
  const [submitting, setSubmitting] = useState(false);

  // store initial defaults for reset
  const [defaultAnswers, setDefaultAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplate = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/templates/${id}`);
      const normalizedQuestions: Question[] = (res.data.questions || []).map(
        (q: Question) => {
          const options =
            q.options?.map((opt: any) =>
              typeof opt === "string" ? { value: opt } : opt
            ) || [];
          return {
            ...q,
            options,
          };
        }
      );
      const logicRules: LogicRule[] = res.data.logicRules || [];

      // Initialize answers with defaults
      const initAnswers: Record<string, any> = {};
      normalizedQuestions.forEach((q) => {
        if (q.type === "multiple") initAnswers[q.text] = [];
        else if (q.type === "dropdown") initAnswers[q.text] = "";
        else initAnswers[q.text] = null;
      });

      setTemplate({
        ...res.data,
        questions: normalizedQuestions,
        logicRules,
      });

      setAnswers(initAnswers);
      setDefaultAnswers(initAnswers);

      // Initialize visibility for follow-ups
      const initVisibility: Record<string, boolean> = {};
      logicRules.forEach((r) => {
        if (r.action?.target) {
          initVisibility[r.action.target] = false;
        }
      });
      setVisibleFollowUps(initVisibility);
    } catch (err) {
      Alert.alert("Error", "Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  // Helper: evaluate a single condition
  const evalCondition = (cond: Condition, ansMap: Record<string, any>) => {
    const raw = ansMap[cond.question];
    if (raw === undefined || raw === null || raw === "") return false;

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
      const aStr = Array.isArray(raw) ? raw.join(",") : String(raw);
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

  const evaluateConditions = (
    conds: Condition[],
    ansMap: Record<string, any>
  ) => {
    if (!conds || conds.length === 0) return false;
    let result = evalCondition(conds[0], ansMap);
    for (let i = 1; i < conds.length; i++) {
      const cond = conds[i];
      const val = evalCondition(cond, ansMap);
      if (cond.logicOp === "OR") result = result || val;
      else result = result && val;
    }
    return result;
  };

  const computeVisibility = (ansSnapshot: Record<string, any>) => {
    const logicRules: LogicRule[] = (template?.logicRules as LogicRule[]) || [];
    const visibility: Record<string, boolean> = {};

    logicRules.forEach((rule) => {
      const target = rule.action?.target;
      if (!target) return;
      const condPass = evaluateConditions(rule.conditions, ansSnapshot);
      if (rule.action?.type === "show") {
        visibility[target] = condPass;
      } else if (rule.action?.type === "hide") {
        visibility[target] = !condPass;
      }
    });
    return visibility;
  };

  // Recompute visibility once template is ready
  useEffect(() => {
    if (!template) return;
    const vis = computeVisibility(answers);
    setVisibleFollowUps(vis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const setAnswer = (
    qText: string,
    value: any,
    type: Question["type"],
    section: string
  ) => {
    setAnswers((prev) => {
      let newValue: any = value;

      if (type === "multiple") {
        const current = prev[qText] || [];
        newValue = current.includes(value)
          ? current.filter((v: string) => v !== value)
          : [...current, value];
      }

      const updated = { ...prev, [qText]: newValue };
      // Recompute visibility based on updated answers
      const visibility = computeVisibility(updated);

      // Remove answers for hidden follow-ups
      Object.keys(visibility).forEach((t) => {
        if (!visibility[t]) {
          if (Object.prototype.hasOwnProperty.call(updated, t)) {
            delete updated[t];
          }
        }
      });

      setVisibleFollowUps(visibility);
      return updated;
    });
  };

  // Image picker functions omitted for brevity (unchanged)

  const pickImage = async (qText: string, section: string) => {
    Alert.alert("Upload Photo", "Choose an option", [
      {
        text: "Take Photo",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) return Alert.alert("Permission required");
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
          handleImageResult(result, qText, section);
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) return Alert.alert("Permission required");
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
          });
          handleImageResult(result, qText, section);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleImageResult = async (
    result: ImagePicker.ImagePickerResult,
    qText: string,
    section: string
  ) => {
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    try {
      const response = await fetch(asset.uri);
      const buffer = await response.arrayBuffer();
      const base64data = `data:${
        asset.type || asset.mimeType || "image/jpeg"
      };base64,${Buffer.from(buffer).toString("base64")}`;
      // upload if your backend expects it
      await axios.post(`${API_URL}/api/uploads`, { base64: base64data }).catch(() => {
        // swallow upload error if backend not available
      });
      setAnswer(qText, base64data, "file", section);
    } catch (err) {
      Alert.alert("Upload failed");
    }
  };

 const handleSubmit = async () => {
  if (!template) {
    return;
  }

  // Transform answers object into array of answer objects
  const answersArray: any[] = [];
  (template.questions as Question[]).forEach((q) => {
    const answerValue = answers[q.text];

    // Only include answered questions or handle mandatory validation separately
    answersArray.push({
      questionText: q.text,
      questionId: q.id,
      section: q.section,
      type: q.type,
      value: answerValue,
    });
  });

  // Validation for mandatory questions
  const missingQuestions: string[] = [];
  (template.questions as Question[]).forEach((q) => {
    const answer = answers[q.text];
    if (q.mandatory) {
      if (q.type === "multiple") {
        if (!Array.isArray(answer) || answer.length === 0) {
          missingQuestions.push(q.text);
        }
      } else {
        if (
          answer === null ||
          answer === undefined ||
          (typeof answer === "string" && answer.trim() === "")
        ) {
          missingQuestions.push(q.text);
        }
      }
    }
  });

  if (missingQuestions.length > 0) {
    return Alert.alert(
      "Missing Answers",
      "Please answer all mandatory questions:\n" + missingQuestions.join("\n")
    );
  }

  setSubmitting(true);
  try {
    const response = await axios.post(`${API_URL}/api/responses`, {
      templateId: id,
      answers: answersArray,
    });
    Alert.alert("Submitted", "Survey submitted successfully!");
    router.back();
  } catch (err) {
    Alert.alert("Error", "Failed to submit");
  } finally {
    setSubmitting(false);
  }
};

// Reset and other helpers unchanged
const handleReset = () => {
  Alert.alert("Reset survey", "Are you sure you want to reset all answers?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Reset",
      style: "destructive",
      onPress: () => {
        setAnswers({ ...defaultAnswers });
        const vis = computeVisibility({ ...defaultAnswers });
        setVisibleFollowUps(vis);
      },
    },
  ]);
};

const isQuestionVisible = (q: Question) => {
  const logicRules: LogicRule[] = (template?.logicRules as LogicRule[]) || [];
  const isFollowUpTarget = logicRules.some(
    (r: LogicRule) => r.action?.target === q.text
  );
  if (isFollowUpTarget) {
    return !!visibleFollowUps[q.text];
  }
  return true;
};

const getProgress = () => {
  if (!template) return { answered: 0, total: 0, percent: 0 };
  const visibleQs = (template.questions || []).filter((q: Question) =>
    isQuestionVisible(q)
  );
  const total = visibleQs.length;
  const answered = visibleQs.filter((q: Question) => {
    const a = answers[q.text];
    if (q.type === "multiple") return Array.isArray(a) && a.length > 0;
    if (q.type === "dropdown") return a !== null && a !== "";
    return a !== null && a !== "" && a !== undefined;
  }).length;
  const percent = total === 0 ? 0 : Math.round((answered / total) * 100);
  return { answered, total, percent };
};

if (loading)
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0b74ff" />
    </View>
  );
if (!template)
  return (
    <View style={styles.center}>
      <Text>Template not found</Text>
    </View>
  );

const { answered, total, percent } = getProgress();

return (
  <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
    {/* Header */}
    <View style={styles.headerCard}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{template.name}</Text>
        <TouchableOpacity onPress={handleReset} style={styles.headerReset}>
          <Text style={styles.headerResetText}>Reset</Text>
        </TouchableOpacity>
      </View>
      {template.description ? (
        <Text style={styles.subtitle}>{template.description}</Text>
      ) : null}

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={styles.progressTextWrap}>
          <Text style={styles.progressText}>
            {answered} / {total} answered
          </Text>
          <Text style={styles.progressPercent}>{percent}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
      </View>
    </View>

    {/* Sections */}
    {(template.sections || []).map((sec: any, i: number) => (
      <View key={`section-${i}`} style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sec.title}</Text>
        </View>
        {sec.description ? (
          <Text style={styles.sectionDesc}>{sec.description}</Text>
        ) : null}

        {(template.questions || [])
          .filter((q: Question) => q.section === sec.title)
          .map((q: Question, j: number) => {
            const current = answers[q.text];
            const logicRules = (template?.logicRules as LogicRule[]) || [];
            const isFollowUpTarget = logicRules.some(
              (r: LogicRule) => r.action?.target === q.text
            );

            let isVisible = true;
            if (isFollowUpTarget) {
              isVisible = !!visibleFollowUps[q.text];
            }

            if (!isVisible) return null;

            return (
              <View key={`${sec.title}-${j}`} style={styles.questionBlock}>
                <View style={styles.qHeaderRow}>
                  <Text style={styles.qText}>
                    {q.text}{" "}
                    {q.mandatory && <Text style={styles.mandatory}>*</Text>}
                  </Text>
                </View>

                {/* SINGLE CHOICE - radio style */}
                {q.type === "single" &&
                  (q.options ?? []).map((opt, k) => {
                    const selected = answers[q.text] === opt.value;
                    return (
                      <TouchableOpacity
                        key={`${q.text}-${k}`}
                        style={[styles.optionRow, selected && styles.optionRowActive]}
                        onPress={() =>
                          setAnswer(q.text, opt.value, "single", sec.title)
                        }
                      >
                        <View style={styles.controlWrap}>
                          <View style={[styles.radio, selected && styles.radioSelected]}>
                            {selected && <View style={styles.radioInner} />}
                          </View>
                        </View>
                        <Text style={[styles.optText, selected && styles.optTextActive]}>
                          {opt.value}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                {/* MULTIPLE CHOICE - checkbox style */}
                {q.type === "multiple" &&
                  (q.options ?? []).map((opt, k) => {
                    const selected = (answers[q.text] || []).includes(opt.value);
                    return (
                      <TouchableOpacity
                        key={`${q.text}-${k}`}
                        style={[styles.optionRow, selected && styles.optionRowActive]}
                        onPress={() =>
                          setAnswer(q.text, opt.value, "multiple", sec.title)
                        }
                      >
                        <View style={styles.controlWrap}>
                          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                            {selected && <Text style={styles.checkboxTick}>✓</Text>}
                          </View>
                        </View>
                        <Text style={[styles.optText, selected && styles.optTextActive]}>
                          {opt.value}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                {/* NUMERIC */}
                {q.type === "numeric" && (
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Enter number"
                    value={answers[q.text] ?? ""}
                    onChangeText={(t) => setAnswer(q.text, t, "numeric", sec.title)}
                  />
                )}

                {/* FILE */}
                {q.type === "file" && (
                  <View style={{ marginTop: 8 }}>
                    {answers[q.text] ? (
                      <Image source={{ uri: answers[q.text] }} style={styles.thumb} />
                    ) : (
                      <View style={styles.filePlaceholder}>
                        <Text style={styles.filePlaceholderText}>No photo</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={styles.uploadBtn}
                        onPress={() => pickImage(q.text, sec.title)}
                      >
                        <Text style={styles.uploadText}>📷 Upload</Text>
                      </TouchableOpacity>
                      {answers[q.text] && (
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => setAnswer(q.text, null, "file", sec.title)}
                        >
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* DROPDOWN */}
                {q.type === "dropdown" && (
                  <View style={styles.dropdownWrapper}>
                    <Picker
                      selectedValue={answers[q.text] ?? ""}
                      onValueChange={(val) => setAnswer(q.text, val, "dropdown", sec.title)}
                    >
                      <Picker.Item label="-- Select an option --" value="" />
                      {(q.options ?? []).map((opt, k) => (
                        <Picker.Item
                          key={`${q.text}-opt-${k}`}
                          label={opt.value}
                          value={opt.value}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
            );
          })}
      </View>
    ))}

    {/* Action buttons */}
    <View style={styles.actionsWrap}>
      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>{submitting ? "Submitting..." : "Submit"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={submitting}>
        <Text style={styles.resetText}>Reset</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  headerCard: {
    margin: 12,
    padding: 14,
    backgroundColor: "#0b74ff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerReset: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerResetText: { color: "#fff", fontWeight: "600" },
  subtitle: { color: "#dbe9ff", marginTop: 6 },

  // Progress
  progressRow: { marginTop: 12 },
  progressTextWrap: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressText: { color: "#dbe9ff", fontWeight: "600" },
  progressPercent: { color: "#fff", fontWeight: "700" },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#34c759",
    borderRadius: 999,
  },

  // Sections
  sectionCard: {
    marginHorizontal: 12,
    marginTop: 14,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0b3b72" },
  sectionDesc: { color: "#666", marginTop: 8 },

  // Questions
  questionBlock: { marginTop: 12 },
  qHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qText: { fontWeight: "700", fontSize: 15, color: "#0b2746" },
  mandatory: { color: "#ff3b30" },

  // Option row
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  optionRowActive: {
    backgroundColor: "#0b74ff",
    borderColor: "#0b74ff",
  },
  controlWrap: { width: 36, justifyContent: "center", alignItems: "center" },

  radio: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#aaa",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  radioSelected: {
    borderColor: "#fff",
    backgroundColor: "#fff",
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: "#0b74ff",
  },

  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#aaa",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxSelected: {
    backgroundColor: "#0b74ff",
    borderColor: "#0b74ff",
  },
  checkboxTick: { color: "#fff", fontWeight: "800" },

  optText: { fontSize: 14, color: "#213045" },
  optTextActive: { color: "#fff" },

  input: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginTop: 8,
  },

  // file
  thumb: { width: 160, height: 100, borderRadius: 8, marginTop: 8 },
  filePlaceholder: {
    width: 160,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f6f7fb",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  filePlaceholderText: { color: "#999" },
  uploadBtn: {
    marginTop: 6,
    padding: 10,
    backgroundColor: "#0b74ff",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  uploadText: { color: "#fff", fontWeight: "700" },
  removeBtn: {
    marginTop: 6,
    marginLeft: 8,
    padding: 10,
    backgroundColor: "#ff3b30",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  removeText: { color: "#fff", fontWeight: "700" },

  dropdownWrapper: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
  },

  // Actions
  actionsWrap: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 36,
    gap: 10,
  },
  submitBtn: {
    padding: 14,
    backgroundColor: "#34c759",
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  resetBtn: {
    padding: 12,
    backgroundColor: "#ff3b30",
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  resetText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});