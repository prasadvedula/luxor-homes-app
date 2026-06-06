package com.luxorhomes.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Extends Capacitor's MessagingService so this is the ONLY Firebase messaging
 * service registered. Gate-pass data messages are handled here (full-screen
 * alert). All other messages are forwarded to super so Capacitor's JS
 * push-notification listeners still fire normally.
 */
public class LuxorMessagingService extends MessagingService {

    private static final String CHANNEL_ID = "gate-pass-alerts";
    private static final int    NOTIF_ID   = 2001;

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token); // lets Capacitor JS receive the token
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();

        if ("gate_pass".equals(data.get("type"))) {
            // Handle entirely here — do NOT call super so the JS layer
            // doesn't show a duplicate default notification.
            showFullScreenAlert(data);
        } else {
            // Let Capacitor deliver all other messages to JS listeners.
            super.onMessageReceived(message);
        }
    }

    // ── Full-screen alert ──────────────────────────────────────────────────────

    private void showFullScreenAlert(Map<String, String> data) {
        ensureChannel();

        String title     = getOrDefault(data, "title",     "Visitor at Gate");
        String body      = getOrDefault(data, "body",      "Someone is at the gate");
        String visitorId = getOrDefault(data, "visitorId", "");

        // Intent that launches the full-screen activity when screen is off / locked
        Intent fsIntent = new Intent(this, GatePassAlertActivity.class);
        fsIntent.putExtra("title",     title);
        fsIntent.putExtra("body",      body);
        fsIntent.putExtra("visitorId", visitorId);
        fsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK |
                          Intent.FLAG_ACTIVITY_CLEAR_TOP |
                          Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent fsPending = PendingIntent.getActivity(
                this, 0, fsIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Tapping the notification banner resumes the app exactly like tapping the icon
        Intent openIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (openIntent == null) openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        PendingIntent openPending = PendingIntent.getActivity(
                this, 1, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder nb =
                new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                        .setPriority(NotificationCompat.PRIORITY_MAX)
                        .setCategory(NotificationCompat.CATEGORY_CALL)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setContentIntent(openPending)
                        .setFullScreenIntent(fsPending, true)
                        .setAutoCancel(false)
                        .setOngoing(true);

        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.notify(NOTIF_ID, nb.build());
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        Uri ringUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        AudioAttributes aa = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();

        NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Gate Pass Alerts", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Full-screen alert when a visitor arrives at the gate");
        ch.setSound(ringUri, aa);
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 500, 300, 500, 300, 500});
        ch.setShowBadge(true);
        ch.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        getSystemService(NotificationManager.class).createNotificationChannel(ch);
    }

    private String getOrDefault(Map<String, String> map, String key, String def) {
        String v = map.get(key);
        return (v != null && !v.isEmpty()) ? v : def;
    }
}
