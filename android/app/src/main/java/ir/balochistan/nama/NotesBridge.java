package ir.balochistan.nama;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.PluginMethod;
import com.getcapacitor.JSObject;
import android.content.Intent;

@CapacitorPlugin(name = "NotesBridge")
public class NotesBridge extends Plugin {

    @PluginMethod
    public void createNote(PluginCall call) {
        String title = call.getString("title", "");
        String body = call.getString("body", "");
        try {
            Intent intent = new Intent("android.intent.action.CREATE_NOTE");
            intent.putExtra(Intent.EXTRA_TITLE, title);
            intent.putExtra(Intent.EXTRA_TEXT, body);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            JSObject res = new JSObject();
            res.put("ok", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed: " + e.getMessage());
        }
    }
}
