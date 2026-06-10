import PostHog from "posthog-react-native";

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

if (__DEV__ && (!apiKey || !host)) {
  console.warn(
    "PostHog: EXPO_PUBLIC_POSTHOG_KEY or EXPO_PUBLIC_POSTHOG_HOST is not set. Analytics will be disabled.",
  );
}

export const posthog = new PostHog(apiKey ?? "placeholder_key", {
  host,
  disabled: !apiKey || !host,
  captureAppLifecycleEvents: true,
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  preloadFeatureFlags: true,
  sendFeatureFlagEvent: true,
  featureFlagsRequestTimeoutMs: 10000,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
});
