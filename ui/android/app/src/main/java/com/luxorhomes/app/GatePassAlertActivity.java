package com.luxorhomes.app;

import android.app.NotificationManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import java.util.Locale;

public class GatePassAlertActivity extends AppCompatActivity {

    private static final int    NOTIF_ID       = 2001;
    private static final String UTTERANCE_ID   = "gate_pass_tts";
    private static final long   REPEAT_DELAY_MS = 7000; // repeat announcement every 7 s

    private TextToSpeech  tts;
    private MediaPlayer   beepPlayer;
    private Vibrator      vibrator;
    private Handler       repeatHandler;
    private Runnable      repeatRunnable;
    private boolean       ttsReady = false;
    private boolean       destroyed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Show over lock screen and wake the display
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

        String title = getIntent().getStringExtra("title");
        String body  = getIntent().getStringExtra("body");

        TextView tvTitle = findViewById(R.id.tv_title);
        TextView tvBody  = findViewById(R.id.tv_body);
        if (title != null) tvTitle.setText(title);
        if (body  != null) tvBody.setText(body);

        Button btnOpen = findViewById(R.id.btn_open_app);
        btnOpen.setOnClickListener(v -> {
            stopAll();
            // Use the launcher intent — same as tapping the app icon.
            // This correctly resumes the existing MainActivity (and its WebView
            // session) rather than creating a new instance that loses auth state.
            Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (open == null) open = new Intent(this, MainActivity.class);
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            startActivity(open);
            finish();
        });

        Button btnDismiss = findViewById(R.id.btn_dismiss);
        btnDismiss.setOnClickListener(v -> { stopAll(); finish(); });

        initTts();
        startVibration();
    }

    // ── Text-to-Speech announcement ──────────────────────────────────────────

    private void initTts() {
        tts = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS || destroyed) return;

            // Prefer Indian English, fall back to generic English
            int result = tts.setLanguage(new Locale("en", "IN"));
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.ENGLISH);
            }

            // Raise pitch and lower speech rate slightly for clarity
            tts.setPitch(1.1f);
            tts.setSpeechRate(0.9f);

            // Route audio through ring/alarm stream so it plays even with media muted
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes aa = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                tts.setAudioAttributes(aa);
            }

            ttsReady = true;

            // After TTS finishes each utterance, wait and repeat
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onError(String id) {}

                @Override
                public void onDone(String id) {
                    if (destroyed) return;
                    repeatHandler = new Handler(Looper.getMainLooper());
                    repeatRunnable = () -> { if (!destroyed) announceAlert(); };
                    repeatHandler.postDelayed(repeatRunnable, REPEAT_DELAY_MS);
                }
            });

            // Speak immediately
            announceAlert();
        });
    }

    private void announceAlert() {
        if (!ttsReady || tts == null || destroyed) return;

        // Play a short attention beep before speaking
        playBeep();

        // Schedule TTS slightly after the beep
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (destroyed || tts == null) return;
            String msg = "Attention! Someone is waiting at the security gate. " +
                         "Please approve or deny the visitor gate pass.";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                tts.speak(msg, TextToSpeech.QUEUE_FLUSH, null, UTTERANCE_ID);
            } else {
                tts.speak(msg, TextToSpeech.QUEUE_FLUSH, null);
            }
        }, 600); // 600 ms after beep
    }

    private void playBeep() {
        try {
            Uri beepUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            beepPlayer = new MediaPlayer();
            AudioAttributes aa = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            beepPlayer.setAudioAttributes(aa);
            beepPlayer.setDataSource(this, beepUri);
            beepPlayer.setLooping(false);
            beepPlayer.prepare();
            beepPlayer.start();
        } catch (Exception ignored) {}
    }

    // ── Vibration ─────────────────────────────────────────────────────────────

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

    // ── Cleanup ───────────────────────────────────────────────────────────────

    private void stopAll() {
        destroyed = true;
        if (repeatHandler != null && repeatRunnable != null) {
            repeatHandler.removeCallbacks(repeatRunnable);
        }
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        if (beepPlayer != null) {
            try { beepPlayer.stop(); } catch (Exception ignored) {}
            beepPlayer.release();
            beepPlayer = null;
        }
        if (vibrator != null) {
            vibrator.cancel();
        }
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(NOTIF_ID);
    }

    @Override
    protected void onDestroy() {
        stopAll();
        super.onDestroy();
    }
}
