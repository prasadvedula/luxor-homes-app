package com.luxorhomes.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Single FCM handler — extends Capacitor's MessagingService so there is only
 * one com.google.firebase.MESSAGING_EVENT receiver registered.
 *
 * Gate-pass flow (targetSdk 34+):
 *   setFullScreenIntent() is a restricted permission on Android 14+.
 *   FCM high-priority messages grant a brief exemption to START ACTIVITIES
 *   directly from onMessageReceived(). We use that exemption to launch
 *   GatePassAlertActivity immediately — no USE_FULL_SCREEN_INTENT needed.
 *   The notification is posted as a persistent banner fallback.
 */
public class LuxorMessagingService extends MessagingService {

    private static final String TAG        = "LuxorFCM";
    // New channel ID forces recreation with correct sound (short beep, not call ringtone)
    private static final String CHANNEL_ID = "gate-pass-v2";
    private static final int    NOTIF_ID   = 2001;

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        if ("gate_pass".equals(data.get("type"))) {
            showGatePassAlert(data);
        } else {
            super.onMessageReceived(message);
        }
    }

    private void showGatePassAlert(Map<String, String> data) {
        ensureChannel();

        String title     = getOrDefault(data, "title",     "Visitor at Gate");
        String body      = getOrDefault(data, "body",      "Someone is at the gate");
        String visitorId = getOrDefault(data, "visitorId", "");

        // ── 1. Directly launch the full-screen activity ────────────────────────
        // FCM high-priority messages grant a system exemption to start activities
        // from the background — this works without USE_FULL_SCREEN_INTENT.
        Intent actIntent = new Intent(this, GatePassAlertActivity.class);
        actIntent.putExtra("title",     title);
        actIntent.putExtra("body",      body);
        actIntent.putExtra("visitorId", visitorId);
        actIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK |
                           Intent.FLAG_ACTIVITY_CLEAR_TOP |
                           Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try {
            startActivity(actIntent);
            Log.d(TAG, "GatePassAlertActivity started directly");
        } catch (Exception e) {
            Log.w(TAG, "Direct activity start failed — notification fallback: " + e.getMessage());
        }

        // ── 2. Post a persistent notification (banner + lock-screen entry) ─────
        Intent openIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (openIntent == null) openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        PendingIntent openPending = PendingIntent.getActivity(
                this, 1, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Full-screen intent as an additional fallback (works when USE_FULL_SCREEN_INTENT is granted)
        PendingIntent fsPending = PendingIntent.getActivity(
                this, 0, actIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder nb = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(openPending)
                .setAutoCancel(false)
                .setOngoing(true);

        // Only add fullScreenIntent when the permission is actually granted
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // API 34
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null && nm.canUseFullScreenIntent()) {
                nb.setFullScreenIntent(fsPending, true);
            }
        } else {
            nb.setFullScreenIntent(fsPending, true);
        }

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(NOTIF_ID, nb.build());
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Short notification beep — NOT the call ringtone.
        // TTS in GatePassAlertActivity handles the voice announcement.
        Uri beepUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        AudioAttributes aa = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();

        NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Gate Pass Alerts", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Alert when a visitor arrives at the security gate");
        ch.setSound(beepUri, aa);
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 400, 200, 400});
        ch.setShowBadge(true);
        ch.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    private String getOrDefault(Map<String, String> map, String key, String def) {
        String v = map.get(key);
        return (v != null && !v.isEmpty()) ? v : def;
    }
}
