package overlay;

import java.lang.reflect.*;
import java.util.List;

/** Shell-only accessibility snapshot. No network, APK installation or persistent service. */
public final class DisplayDump {
    private static int count;
    private static Object call(Object o, String name) throws Exception {
        return o.getClass().getMethod(name).invoke(o);
    }
    private static String xml(Object value) {
        String s = value == null ? "" : value.toString();
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace("\"", "&quot;").replace("\n", "&#10;").replace("\r", "&#13;");
    }
    private static void attr(StringBuilder out, String name, Object value) {
        out.append(' ').append(name).append("=\"").append(xml(value)).append('"');
    }
    private static void node(StringBuilder out, Object n, int depth) throws Exception {
        if (n == null) return;
        if (++count > 12000 || depth > 100) throw new Exception("Hierarchy exceeds limits");
        out.append("<node");
        String[][] fields = {{"package","getPackageName"},{"text","getText"},{"content-desc","getContentDescription"},
            {"class","getClassName"},{"enabled","isEnabled"},{"checkable","isCheckable"},{"checked","isChecked"}};
        for (String[] f: fields) attr(out, f[0], call(n, f[1]));
        Class<?> rectClass = Class.forName("android.graphics.Rect");
        Object rect = rectClass.getConstructor().newInstance();
        n.getClass().getMethod("getBoundsInScreen", rectClass).invoke(n, rect);
        attr(out,"bounds","["+rectClass.getField("left").getInt(rect)+","+rectClass.getField("top").getInt(rect)+"]["+
            rectClass.getField("right").getInt(rect)+","+rectClass.getField("bottom").getInt(rect)+"]");
        out.append('>');
        int children = (Integer)call(n, "getChildCount");
        for (int i=0;i<children;i++) {
            Object child=n.getClass().getMethod("getChild", int.class).invoke(n,i);
            try { node(out,child,depth+1); } finally { if(child!=null) call(child,"recycle"); }
        }
        out.append("</node>");
    }
    public static void main(String[] args) {
        Object wrapper=null;
        try {
            int display=Integer.parseInt(args[0]);
            wrapper=Class.forName("com.android.uiautomator.core.UiAutomationShellWrapper").getConstructor().newInstance();
            call(wrapper,"connect");Object automation=call(wrapper,"getUiAutomation");
            Object service=call(automation,"getServiceInfo");
            Field flags=service.getClass().getField("flags");flags.setInt(service,flags.getInt(service)|64);
            automation.getClass().getMethod("setServiceInfo",service.getClass()).invoke(automation,service);
            Thread.sleep(300);
            Object windows=call(automation,"getWindowsOnAllDisplays");
            List<?> entries=(List<?>)windows.getClass().getMethod("get",int.class).invoke(windows,display);
            if(entries==null||entries.isEmpty())throw new Exception("No accessible windows on display "+display);
            StringBuilder out=new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?><hierarchy display-id=\""+display+"\">");
            for(Object window:entries){Object root=call(window,"getRoot");try{node(out,root,0);}finally{if(root!=null)call(root,"recycle");}}
            out.append("</hierarchy>");System.out.println(out);
        } catch(Throwable e) {
            Throwable cause=e instanceof InvocationTargetException?((InvocationTargetException)e).getTargetException():e;
            System.err.println("Virtual display accessibility unavailable: "+cause.getClass().getSimpleName()+": "+cause.getMessage());
            throw new RuntimeException("Virtual display capture failed",cause);
        } finally {if(wrapper!=null)try{call(wrapper,"disconnect");}catch(Exception ignored){}}
    }
}
