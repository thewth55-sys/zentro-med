package com.zentrolabs.zentromed;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int MIC_PERMISSION_REQUEST = 101;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // El WebView solo puede grabar notas de voz (getUserMedia) si el
        // permiso de micrófono de Android ya está otorgado — Capacitor
        // concede el permiso web sobre esa base. Lo pedimos al abrir la app.
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{ Manifest.permission.RECORD_AUDIO },
                MIC_PERMISSION_REQUEST
            );
        }
    }
}
