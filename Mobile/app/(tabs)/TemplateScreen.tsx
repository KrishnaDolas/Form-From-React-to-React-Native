import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import axios from "axios";

const API_URLS = [
  "http://10.193.25.18:5000/api/templates",
  "http://192.168.56.1:5000/api/templates"
];

// Example: pick the first available one
const API_URL = API_URLS[0] || API_URLS[1];


type Template = {
  _id: string;
  name: string;
  description: string;
  status: string;
};

export default function TemplatesScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null);
      const res = await axios.get(API_URL);
      setTemplates(res.data || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
      setError("⚠️ Failed to load templates. Pull to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0b74ff" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const renderCard = ({ item }: { item: Template }) => {
    const isPublished = item.status === "published";
    const scale = new Animated.Value(1);

    const onPressIn = () => {
      Animated.spring(scale, {
        toValue: 0.97,
        useNativeDriver: true,
      }).start();
    };

    const onPressOut = () => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() =>
            router.push({
              pathname: "/Survey/[id]",
              params: { id: item._id },
            })
          }
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isPublished ? "#34c759" : "#ff9500" },
              ]}
            >
              <Text style={styles.statusText}>
                {isPublished ? "Published" : "Draft"}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>
            {item.description || "No description provided."}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerText}>📋 Templates</Text>
      </View>

      {templates.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyText}>No templates found.</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fbff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerBar: {
    padding: 16,
    backgroundColor: "#0b74ff",
    elevation: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 18,
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 17,
    color: "#222",
    flex: 1,
    paddingRight: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
    lineHeight: 20,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  loadingText: {
    marginTop: 8,
    color: "#555",
    fontSize: 15,
  },
  errorText: {
    color: "#e63946",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyIcon: {
    fontSize: 46,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
