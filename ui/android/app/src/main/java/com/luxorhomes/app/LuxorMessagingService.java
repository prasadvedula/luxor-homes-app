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
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class LuxorMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID   = "gate-pass-alerts";
    private static final int    NOTIF_ID     = 2001;

    @Override
    public void onNewToken(String token) {
        // @capacitor/push-notifications handles token refresh via JS listener
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        if ("gate_pass".equals(data.get("type"))) {
            showFullScreenAlert(data);
        }
    }

    private void showFullScreenAlert(Map<String, String> data) {
        ensureChannel();

        String title     = getOrDefault(data, "title", "Visitor at Gate");
        String body      = getOrDefault(data, "body",  "Someone is at the gate");
        String visitorId = getOrDefault(data, "visitorId", "");

        // Full-screen intent — shown when screen is off / locked
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

        // Tap-on-notification intent — opens app when screen is on
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
                this, 1, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder =
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
                        .setAutoCancel(true)
                        .setOngoing(false);

        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.notify(NOTIF_ID, builder.build());
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

        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(ch);
    }

    private String getOrDefault(Map<String, String> map, String key, String def) {
        String v = map.get(key);
        return (v != null && !v.isEmpty()) ? v : def;
    }
}
