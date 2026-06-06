package com.luxorhomes.app;

import android.app.NotificationManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class GatePassAlertActivity extends AppCompatActivity {

    private static final int NOTIF_ID = 2001;

    private MediaPlayer mediaPlayer;
    private Vibrator    vibrator;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Show over lock screen and turn on the display
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_gate_pass);

        // Populate visitor info from FCM data extras
        String title = getIntent().getStringExtra("title");
        String body  = getIntent().getStringExtra("body");

        TextView tvTitle = findViewById(R.id.tv_title);
        TextView tvBody  = findViewById(R.id.tv_body);
        if (title != null) tvTitle.setText(title);
        if (body  != null) tvBody.setText(body);

        // Open app — resident taps to approve / deny inside the app
        Button btnOpen = findViewById(R.id.btn_open_app);
        btnOpen.setOnClickListener(v -> {
            stopAlert();
            Intent open = new Intent(this, MainActivity.class);
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(open);
            finish();
        });

        // Dismiss without opening app
        Button btnDismiss = findViewById(R.id.btn_dismiss);
        btnDismiss.setOnClickListener(v -> { stopAlert(); finish(); });

        startRingtone();
        startVibration();
    }

    private void startRingtone() {
        try {
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            mediaPlayer = new MediaPlayer();
            AudioAttributes aa = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            mediaPlayer.setAudioAttributes(aa);
            mediaPlayer.setDataSource(this, uri);
            mediaPlayer.setLooping(true);
            mediaPlayer.setVolume(1f, 1f);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) { /* ignore */ }
    }

    private void startVibration() {
        vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        long[] pattern = {0, 600, 300, 600, 300, 600};
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
        } else {
            vibrator.vibrate(pattern, 0);
        }
    }

    private void stopAlert() {
        if (mediaPlayer != null) {
            try { mediaPlayer.stop(); } catch (Exception ignored) {}
            mediaPlayer.release();
            mediaPlayer = null;
        }
        if (vibrator != null) { vibrator.cancel(); }
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(NOTIF_ID);
    }

    @Override
    protected void onDestroy() {
        stopAlert();
        super.onDestroy();
    }
}
