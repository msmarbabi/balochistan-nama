package ir.balochistan.nama.qs;

import android.content.Intent;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

import ir.balochistan.nama.MainActivity;

/**
 * v1.18 — Quick Settings Tile «رویداد سریع»
 * با لمس کردن، اپ را باز می‌کند و مودال رویدادهای شخصی را نمایش می‌دهد
 * (برای افزودن سریع رویداد/تولد/تسک).
 */
public class NewEventTileService extends TileService {
    @Override
    public void onStartListening() {
        try {
            Tile tile = getQSTile();
            if (tile != null) {
                tile.setState(Tile.STATE_INACTIVE);
                tile.setLabel("رویداد سریع");
                tile.updateTile();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onClick() {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.putExtra("bx_action", "open_pe_modal");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            // روی API 31+ باید از START_FOREGROUND استفاده شود
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                intent.setAction(Intent.ACTION_VIEW);
            }
            startActivityAndCollapse(intent);
        } catch (Exception ignored) {}
        super.onClick();
    }
}
