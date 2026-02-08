declare namespace NodeJS {
    interface ProcessEnv {
        EXPO_PUBLIC_API_URL?: string;
        EXPO_PUBLIC_ONESIGNAL_APP_ID: string;
        EXPO_PUBLIC_PUSHER_APP_KEY: string;
        EXPO_PUBLIC_PUSHER_APP_CLUSTER: string;
    }
}
