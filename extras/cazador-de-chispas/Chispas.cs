using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

// ======================= SONIDO (música y efectos generados por código) =======================
static class Sonido
{
    [DllImport("winmm.dll", CharSet = CharSet.Unicode)]
    static extern int mciSendString(string c, StringBuilder r, int l, IntPtr h);
    static void M(string c) { mciSendString(c, null, 0, IntPtr.Zero); }
    const int SR = 22050;
    static string dir = Path.Combine(Path.GetTempPath(), "chispas_snd");
    public static string[] Pistas = { "Neón", "Calma", "Turbo", "Apagada" };
    public static int volM = 6, volE = 7, pista = 0;
    static string[] fx = { "chispa", "golpe", "nivel", "click", "poder" };

    public static void Init()
    {
        Directory.CreateDirectory(dir);
        Guardar("m0", Musica(128, new[] { 57, 53, 48, 55 }, new[] { 0, 3, 5, 7, 10 }, 0, 1));
        Guardar("m1", Musica(84, new[] { 60, 57, 53, 55 }, new[] { 0, 2, 4, 7, 9 }, 2, 2));
        Guardar("m2", Musica(160, new[] { 52, 52, 48, 50 }, new[] { 0, 3, 5, 7, 10, 12 }, 0, 3));
        float[] b;
        b = new float[SR / 6]; Tono(b, 0, 880, 0.06, 0.5, 0); Tono(b, SR / 20, 1320, 0.1, 0.5, 0); Guardar("chispa", b);
        b = new float[SR / 3]; Ruido(b, 0, 0.3, 0.7); Tono(b, 0, 110, 0.3, 0.6, 0); Guardar("golpe", b);
        b = new float[SR]; int[] ar = { 60, 64, 67, 72, 76 };
        for (int i = 0; i < 5; i++) Tono(b, i * SR / 10, F(ar[i]), 0.25, 0.4, 0); Guardar("nivel", b);
        b = new float[SR / 12]; Tono(b, 0, 660, 0.05, 0.4, 1); Guardar("click", b);
        b = new float[SR / 2]; for (int i = 0; i < 8; i++) Tono(b, i * SR / 20, F(60 + i * 2), 0.08, 0.35, 1); Guardar("poder", b);
        foreach (var f in fx) M("open \"" + Path.Combine(dir, f + ".wav") + "\" type mpegvideo alias " + f);
        Pista(pista);
    }

    static double F(int m) { return 440 * Math.Pow(2, (m - 69) / 12.0); }

    static void Tono(float[] b, int ini, double f, double dur, double vol, int w)
    {
        int n = (int)(dur * SR);
        for (int i = 0; i < n && ini + i < b.Length; i++)
        {
            double t = (double)i / SR, ph = (t * f) % 1.0, env = Math.Min(1, i / 80.0) * (1 - (double)i / n);
            double s = w == 0 ? (ph < 0.5 ? 0.6 : -0.6) : w == 1 ? (4 * Math.Abs(ph - 0.5) - 1) : Math.Sin(2 * Math.PI * ph);
            b[ini + i] += (float)(s * vol * env);
        }
    }

    static Random rr = new Random(7);
    static void Ruido(float[] b, int ini, double dur, double vol)
    {
        int n = (int)(dur * SR);
        for (int i = 0; i < n && ini + i < b.Length; i++) b[ini + i] += (float)((rr.NextDouble() * 2 - 1) * vol * (1 - (double)i / n));
    }

    static float[] Musica(int bpm, int[] prog, int[] esc, int w, int seed)
    {
        var r = new Random(seed); double beat = 60.0 / bpm; int bs = (int)(beat * SR);
        var b = new float[bs * 32]; int[] mel = new int[8];
        for (int bar = 0; bar < 8; bar++)
        {
            int root = prog[bar % prog.Length];
            if (bar % 2 == 0) for (int k = 0; k < 8; k++) mel[k] = r.NextDouble() < 0.75 ? esc[r.Next(esc.Length)] : -99;
            for (int q = 0; q < 4; q++)
            {
                int s = (bar * 4 + q) * bs;
                Tono(b, s, F(root - 12), beat * 0.9, 0.28, 1);   // bajo
                Tono(b, s, 55, 0.12, 0.5, 2);                    // bombo
                Ruido(b, s + bs / 2, 0.04, 0.08);                // platillo
                for (int h = 0; h < 2; h++) { int m = mel[q * 2 + h]; if (m > -99) Tono(b, s + h * bs / 2, F(root + 12 + m), beat * 0.45, 0.13, w); }
            }
        }
        return b;
    }

    static void Guardar(string nom, float[] s)
    {
        using (var bw = new BinaryWriter(File.Create(Path.Combine(dir, nom + ".wav"))))
        {
            int n = s.Length * 2;
            bw.Write(Encoding.ASCII.GetBytes("RIFF")); bw.Write(36 + n); bw.Write(Encoding.ASCII.GetBytes("WAVEfmt "));
            bw.Write(16); bw.Write((short)1); bw.Write((short)1); bw.Write(SR); bw.Write(SR * 2); bw.Write((short)2); bw.Write((short)16);
            bw.Write(Encoding.ASCII.GetBytes("data")); bw.Write(n);
            foreach (var v in s) bw.Write((short)(Math.Max(-1, Math.Min(1, v)) * 30000));
        }
    }

    public static void Pista(int i)
    {
        pista = i; M("close mus");
        if (i < 3) { M("open \"" + Path.Combine(dir, "m" + i + ".wav") + "\" type mpegvideo alias mus"); Vol(); M("play mus repeat"); }
    }
    public static void Vol() { M("setaudio mus volume to " + volM * 100); }
    public static void Fx(string f) { if (volE == 0) return; M("setaudio " + f + " volume to " + volE * 100); M("play " + f + " from 0"); }
    public static void Cerrar() { M("close all"); }
}

class Ene { public float x, y, dx, dy, r; public int t; }
class Obj { public float x, y; public int t, vida; }
class Par { public float x, y, dx, dy; public int v; public Color c; }

// ======================= JUEGO =======================
class Juego : Form
{
    const int W = 800, H = 600;
    Timer timer = new Timer();
    Random rnd = new Random();
    string est = "menu", volverA = "menu"; int sel;
    string archivo = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "chispas_save.txt");

    // progreso guardado
    int monedas, record, nivelRec, skin, fondo, upVida, upSuerte, ultGan;
    HashSet<string> tiene = new HashSet<string> { "s0", "f0" }, logros = new HashSet<string>();

    // partida
    PointF p, ch; float vx, vy;
    List<Ene> en = new List<Ene>(); List<Obj> pw = new List<Obj>(); List<Par> par = new List<Par>();
    int pts, nivel, recog, meta, combo, comboT, vidas, inv, escudo, iman, lento, dashCd, dashMax, temblor, frames;
    float velM, imanRad, valorM;
    bool iz, de, ar, ab;
    string[] opMejora; string toast = ""; int toastT;
    float[][] estrellas;

    string[] skinN = { "Cubo azul", "Bola verde", "Diamante rosa", "Estrella dorada", "Arcoíris" }; int[] skinP = { 0, 60, 120, 250, 500 };
    string[] fondoN = { "Noche estrellada", "Cuadrícula neón", "Océano profundo", "Volcán" }; int[] fondoP = { 0, 80, 160, 300 };
    int[] costoVida = { 150, 400 }, costoSuerte = { 100, 250, 500 };
    string[] perks = { "Velocidad +15%", "Imán de chispas", "Chispas valen +50%", "Vida extra", "Dash recarga más rápido", "Escudo de 4s" };
    string[] logId = { "n2", "c5", "n5", "n10", "p1000", "p5000", "compra3" };
    string[] logNom = { "Primer paso: llega al nivel 2", "Imparable: combo x5", "Veterano: llega al nivel 5", "Leyenda: llega al nivel 10", "1.000 puntos en una partida", "5.000 puntos en una partida", "Comprador: compra 3 cosas" };
    int[] logPremio = { 20, 50, 100, 300, 100, 400, 100 };

    Font fT = new Font("Segoe UI", 34, FontStyle.Bold), fM = new Font("Segoe UI", 15, FontStyle.Bold), fS = new Font("Segoe UI", 10);

    Juego()
    {
        Text = "Cazador de Chispas"; ClientSize = new Size(W, H);
        FormBorderStyle = FormBorderStyle.FixedSingle; MaximizeBox = false; DoubleBuffered = true;
        StartPosition = FormStartPosition.CenterScreen;
        estrellas = new float[90][];
        for (int i = 0; i < estrellas.Length; i++) estrellas[i] = new float[] { rnd.Next(W), rnd.Next(H), (float)rnd.NextDouble() * 1.5f + 0.3f };
        Cargar();
        Sonido.Init();
        timer.Interval = 16; timer.Tick += (s, e) => { Paso(); Invalidate(); }; timer.Start();
        KeyDown += (s, e) => Tecla(e.KeyCode, true);
        KeyUp += (s, e) => Tecla(e.KeyCode, false);
        FormClosing += (s, e) => { Guardar(); Sonido.Cerrar(); };
    }

    // ---------- guardar / cargar ----------
    void Cargar()
    {
        try
        {
            var d = File.ReadAllLines(archivo).Select(l => l.Split('=')).Where(a => a.Length == 2).ToDictionary(a => a[0], a => a[1]);
            monedas = int.Parse(d["monedas"]); record = int.Parse(d["record"]); nivelRec = int.Parse(d["nivel"]);
            skin = int.Parse(d["skin"]); fondo = int.Parse(d["fondo"]); upVida = int.Parse(d["vida"]); upSuerte = int.Parse(d["suerte"]);
            Sonido.pista = int.Parse(d["pista"]); Sonido.volM = int.Parse(d["volM"]); Sonido.volE = int.Parse(d["volE"]);
            foreach (var x in d["tiene"].Split(',')) if (x != "") tiene.Add(x);
            foreach (var x in d["logros"].Split(',')) if (x != "") logros.Add(x);
        }
        catch { }
    }
    void Guardar()
    {
        try
        {
            File.WriteAllLines(archivo, new[] { "monedas=" + monedas, "record=" + record, "nivel=" + nivelRec, "skin=" + skin, "fondo=" + fondo,
                "vida=" + upVida, "suerte=" + upSuerte, "pista=" + Sonido.pista, "volM=" + Sonido.volM, "volE=" + Sonido.volE,
                "tiene=" + string.Join(",", tiene), "logros=" + string.Join(",", logros) });
        }
        catch { }
    }

    void Ir(string e) { est = e; sel = 0; }
    void Toast(string s) { toast = s; toastT = 200; }
    void Logro(string id)
    {
        int i = Array.IndexOf(logId, id);
        if (i >= 0 && logros.Add(id)) { monedas += logPremio[i]; Toast("¡Logro desbloqueado! " + logNom[i] + "  (+" + logPremio[i] + " monedas)"); Sonido.Fx("poder"); Guardar(); }
    }

    // ---------- teclado ----------
    void Tecla(Keys k, bool d)
    {
        if (k == Keys.Left || k == Keys.A) iz = d;
        if (k == Keys.Right || k == Keys.D) de = d;
        if (k == Keys.Up || k == Keys.W) ar = d;
        if (k == Keys.Down || k == Keys.S) ab = d;
        if (!d) return;
        if (k == Keys.M) { Sonido.Pista((Sonido.pista + 1) % 4); Toast("Música: " + Sonido.Pistas[Sonido.pista]); return; }
        if (est == "juego")
        {
            if (k == Keys.Escape || k == Keys.P) Ir("pausa");
            if (k == Keys.Space || k == Keys.ShiftKey) Dash();
            return;
        }
        int n = Opc().Length;
        if (k == Keys.Up || k == Keys.W) { sel = (sel + n - 1) % n; Sonido.Fx("click"); }
        else if (k == Keys.Down || k == Keys.S) { sel = (sel + 1) % n; Sonido.Fx("click"); }
        else if (k == Keys.Left || k == Keys.A) Ajustar(-1);
        else if (k == Keys.Right || k == Keys.D) Ajustar(1);
        else if (k == Keys.Enter || k == Keys.Space) Aceptar();
        else if (k == Keys.Escape)
        {
            if (est == "pausa") Ir("juego");
            else if (est == "opciones") { Guardar(); Ir(volverA); }
            else if (est == "tienda" || est == "logros" || est == "fin") Ir("menu");
        }
    }

    string Barra(int v) { return new string('■', v) + new string('□', 10 - v); }

    string[] Opc()
    {
        switch (est)
        {
            case "menu": return new[] { "Jugar", "Tienda", "Opciones", "Logros", "Salir" };
            case "pausa": return new[] { "Continuar", "Opciones", "Abandonar partida" };
            case "mejora": return opMejora;
            case "opciones": return new[] { "Música:  ◀ " + Sonido.Pistas[Sonido.pista] + " ▶", "Volumen música:  ◀ " + Barra(Sonido.volM) + " ▶", "Volumen efectos:  ◀ " + Barra(Sonido.volE) + " ▶", "Volver" };
            case "tienda":
                var l = new List<string>();
                for (int i = 0; i < 5; i++) l.Add("Personaje: " + skinN[i] + "  —  " + (tiene.Contains("s" + i) ? (skin == i ? "EQUIPADO" : "tuyo") : skinP[i] + " monedas"));
                for (int i = 0; i < 4; i++) l.Add("Fondo: " + fondoN[i] + "  —  " + (tiene.Contains("f" + i) ? (fondo == i ? "EQUIPADO" : "tuyo") : fondoP[i] + " monedas"));
                l.Add("Vida inicial extra (" + upVida + "/2)  —  " + (upVida < 2 ? costoVida[upVida] + " monedas" : "MÁX"));
                l.Add("Suerte: más poderes (" + upSuerte + "/3)  —  " + (upSuerte < 3 ? costoSuerte[upSuerte] + " monedas" : "MÁX"));
                l.Add("Volver");
                return l.ToArray();
            case "fin": return new[] { "Continuar" };
            default: return new[] { "Volver" };
        }
    }

    void Ajustar(int d)
    {
        if (est != "opciones") return;
        if (sel == 0) Sonido.Pista((Sonido.pista + d + 4) % 4);
        if (sel == 1) { Sonido.volM = Math.Max(0, Math.Min(10, Sonido.volM + d)); Sonido.Vol(); }
        if (sel == 2) { Sonido.volE = Math.Max(0, Math.Min(10, Sonido.volE + d)); }
        Sonido.Fx("click");
    }

    bool Pagar(int c) { if (monedas < c) { Toast("No te alcanzan las monedas. ¡Juega para ganar más!"); return false; } monedas -= c; Sonido.Fx("poder"); return true; }

    void Aceptar()
    {
        Sonido.Fx("click");
        switch (est)
        {
            case "menu":
                if (sel == 0) Nuevo(); else if (sel == 1) Ir("tienda");
                else if (sel == 2) { volverA = "menu"; Ir("opciones"); }
                else if (sel == 3) Ir("logros"); else Close();
                break;
            case "pausa":
                if (sel == 0) Ir("juego"); else if (sel == 1) { volverA = "pausa"; Ir("opciones"); } else { Fin(); }
                break;
            case "mejora": Aplicar(opMejora[sel]); Ir("juego"); break;
            case "opciones": if (sel == 3) { Guardar(); Ir(volverA); } break;
            case "tienda":
                int s = sel;
                if (s < 5) { if (tiene.Contains("s" + s) || Pagar(skinP[s])) { tiene.Add("s" + s); skin = s; } }
                else if (s < 9) { int f = s - 5; if (tiene.Contains("f" + f) || Pagar(fondoP[f])) { tiene.Add("f" + f); fondo = f; } }
                else if (s == 9) { if (upVida < 2 && Pagar(costoVida[upVida])) upVida++; }
                else if (s == 10) { if (upSuerte < 3 && Pagar(costoSuerte[upSuerte])) upSuerte++; }
                else { Ir("menu"); return; }
                if (tiene.Count - 2 + upVida + upSuerte >= 3) Logro("compra3");
                Guardar(); sel = s;
                break;
            default: Ir("menu"); break;
        }
    }

    // ---------- partida ----------
    void Nuevo()
    {
        p = new PointF(W / 2, H / 2); vx = vy = 0; pts = 0; nivel = 1; recog = 0; meta = 6; combo = 1; comboT = 0;
        vidas = 1 + upVida; inv = 0; escudo = 90; iman = lento = dashCd = temblor = 0; dashMax = 90;
        velM = 1; imanRad = 0; valorM = 1;
        en.Clear(); pw.Clear(); par.Clear();
        Enemigo(0); Enemigo(0); NuevaChispa(); Ir("juego");
    }

    void NuevaChispa()
    {
        do { ch = new PointF(rnd.Next(40, W - 40), rnd.Next(60, H - 40)); } while (Dist(ch, p) < 120);
    }

    void Enemigo(int t)
    {
        var e = new Ene { t = t };
        do { e.x = rnd.Next(30, W - 30); e.y = rnd.Next(30, H - 30); } while (Dist(new PointF(e.x, e.y), p) < 220);
        double a = rnd.NextDouble() * Math.PI * 2, v = 1.8 + nivel * 0.25;
        if (t == 1) v *= 0.6; if (t == 2) v *= 0.5;
        e.r = t == 2 ? 24 : t == 1 ? 11 : 10;
        e.dx = (float)(Math.Cos(a) * v); e.dy = (float)(Math.Sin(a) * v);
        en.Add(e);
    }

    int TipoAzar() { int m = nivel >= 4 ? 3 : nivel >= 2 ? 2 : 1; return rnd.Next(m); }

    void Dash()
    {
        float d = (float)Math.Sqrt(vx * vx + vy * vy);
        if (dashCd > 0 || d < 0.5f) return;
        vx = vx / d * 15; vy = vy / d * 15; inv = Math.Max(inv, 14); dashCd = dashMax;
        Explosion(p, Color.White, 8); Sonido.Fx("click");
    }

    void Explosion(PointF c, Color col, int n)
    {
        for (int i = 0; i < n; i++)
        {
            double a = rnd.NextDouble() * Math.PI * 2, v = rnd.NextDouble() * 4 + 1;
            par.Add(new Par { x = c.X, y = c.Y, dx = (float)(Math.Cos(a) * v), dy = (float)(Math.Sin(a) * v), v = 30 + rnd.Next(20), c = col });
        }
    }

    void SubirNivel()
    {
        nivel++; Sonido.Fx("nivel");
        if (nivel >= 2) Logro("n2"); if (nivel >= 5) Logro("n5"); if (nivel >= 10) Logro("n10");
        meta = recog + 5 + nivel * 2;
        en.Clear(); for (int i = 0; i < Math.Min(12, 1 + nivel); i++) Enemigo(TipoAzar());
        escudo = 120;
        opMejora = perks.OrderBy(x => rnd.Next()).Take(3).ToArray();
        Ir("mejora");
    }

    void Aplicar(string n)
    {
        switch (n)
        {
            case "Velocidad +15%": velM *= 1.15f; break;
            case "Imán de chispas": imanRad += 90; break;
            case "Chispas valen +50%": valorM += 0.5f; break;
            case "Vida extra": vidas++; break;
            case "Dash recarga más rápido": dashMax = Math.Max(25, dashMax - 20); break;
            case "Escudo de 4s": escudo = 240; break;
        }
    }

    void Golpe()
    {
        vidas--; inv = 90; temblor = 15; Sonido.Fx("golpe"); Explosion(p, Color.DeepSkyBlue, 25);
        if (vidas <= 0) Fin();
    }

    void Fin()
    {
        ultGan = pts / 20 + (nivel - 1) * 5; monedas += ultGan;
        if (pts > record) record = pts; if (nivel > nivelRec) nivelRec = nivel;
        if (pts >= 1000) Logro("p1000"); if (pts >= 5000) Logro("p5000");
        Guardar(); Ir("fin");
    }

    static float Dist(PointF a, PointF b) { return (float)Math.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y)); }

    void Paso()
    {
        frames++; if (toastT > 0) toastT--;
        for (int i = par.Count - 1; i >= 0; i--) { var q = par[i]; q.x += q.dx; q.y += q.dy; q.dx *= 0.94f; q.dy *= 0.94f; if (--q.v <= 0) par.RemoveAt(i); }
        if (est != "juego") return;

        float acc = 0.6f * velM;
        vx += (de ? acc : 0) - (iz ? acc : 0); vy += (ab ? acc : 0) - (ar ? acc : 0);
        vx *= 0.9f; vy *= 0.9f;
        p.X = Math.Max(10, Math.Min(W - 10, p.X + vx)); p.Y = Math.Max(10, Math.Min(H - 10, p.Y + vy));
        if (inv > 0) inv--; if (escudo > 0) escudo--; if (iman > 0) iman--; if (lento > 0) lento--;
        if (dashCd > 0) dashCd--; if (temblor > 0) temblor--;
        if (comboT > 0) comboT--; else combo = 1;

        // imán
        float rad = iman > 0 ? 260 : imanRad, dc = Dist(p, ch);
        if (rad > 0 && dc < rad && dc > 1) { ch.X += (p.X - ch.X) / dc * 4; ch.Y += (p.Y - ch.Y) / dc * 4; }

        // chispa
        if (Dist(p, ch) < 22)
        {
            recog++; combo = comboT > 0 ? Math.Min(5, combo + 1) : 1; comboT = 150;
            pts += (int)(10 * combo * valorM);
            Sonido.Fx("chispa"); Explosion(ch, Color.Gold, 14);
            if (combo == 5) Logro("c5");
            NuevaChispa();
            if (rnd.Next(100) < 12 + upSuerte * 6) pw.Add(new Obj { x = rnd.Next(40, W - 40), y = rnd.Next(60, H - 40), t = rnd.Next(4), vida = 600 });
            if (recog % 4 == 0 && en.Count < 14) Enemigo(TipoAzar());
            if (recog >= meta) SubirNivel();
        }
        if (est != "juego") return;

        // poderes
        string[] pn = { "¡Imán!", "¡Tiempo lento!", "¡Bomba!", "¡Vida extra!" };
        for (int i = pw.Count - 1; i >= 0; i--)
        {
            var o = pw[i];
            if (--o.vida <= 0) { pw.RemoveAt(i); continue; }
            if (Dist(p, new PointF(o.x, o.y)) < 24)
            {
                if (o.t == 0) iman = 480; if (o.t == 1) lento = 360; if (o.t == 3) vidas++;
                if (o.t == 2)
                {
                    for (int j = en.Count - 1; j >= 0; j--)
                        if (Dist(p, new PointF(en[j].x, en[j].y)) < 220) { Explosion(new PointF(en[j].x, en[j].y), Color.OrangeRed, 20); en.RemoveAt(j); pts += 25; }
                    temblor = 10; Sonido.Fx("golpe");
                }
                Sonido.Fx("poder"); Toast(pn[o.t]); pw.RemoveAt(i);
            }
        }

        // enemigos
        float sp = lento > 0 ? 0.35f : 1f;
        foreach (var e in en)
        {
            if (e.t == 1)
            {
                float d = Dist(p, new PointF(e.x, e.y)) + 0.01f, max = 2f + nivel * 0.12f;
                e.dx += (p.X - e.x) / d * 0.08f; e.dy += (p.Y - e.y) / d * 0.08f;
                float v = (float)Math.Sqrt(e.dx * e.dx + e.dy * e.dy);
                if (v > max) { e.dx = e.dx / v * max; e.dy = e.dy / v * max; }
            }
            e.x += e.dx * sp; e.y += e.dy * sp;
            if (e.x < e.r || e.x > W - e.r) { e.dx = -e.dx; e.x = Math.Max(e.r, Math.Min(W - e.r, e.x)); }
            if (e.y < e.r || e.y > H - e.r) { e.dy = -e.dy; e.y = Math.Max(e.r, Math.Min(H - e.r, e.y)); }
            if (inv == 0 && escudo == 0 && Dist(p, new PointF(e.x, e.y)) < e.r + 9) Golpe();
        }
    }

    // ---------- dibujo ----------
    static Color Hue(double h)
    {
        h = (h % 360 + 360) % 360; double x = 1 - Math.Abs(h / 60 % 2 - 1); double r = 0, g = 0, b = 0;
        if (h < 60) { r = 1; g = x; } else if (h < 120) { r = x; g = 1; } else if (h < 180) { g = 1; b = x; }
        else if (h < 240) { g = x; b = 1; } else if (h < 300) { r = x; b = 1; } else { r = 1; b = x; }
        return Color.FromArgb((int)(r * 255), (int)(g * 255), (int)(b * 255));
    }

    void Fondo(Graphics g)
    {
        if (fondo == 0)
        {
            g.Clear(Color.FromArgb(12, 14, 34));
            foreach (var s in estrellas)
            {
                float y = (s[1] + frames * s[2] * 0.3f) % H; int a = 120 + (int)(Math.Sin(frames * 0.05 + s[0]) * 100);
                using (var b = new SolidBrush(Color.FromArgb(Math.Max(0, a), 255, 255, 255))) g.FillRectangle(b, s[0], y, s[2] + 1, s[2] + 1);
            }
        }
        else if (fondo == 1)
        {
            g.Clear(Color.FromArgb(16, 6, 28)); int o = frames % 40;
            using (var pen = new Pen(Color.FromArgb(70, 255, 0, 200)))
            {
                for (int x = -40 + o; x < W; x += 40) g.DrawLine(pen, x, 0, x, H);
                for (int y = -40 + o; y < H; y += 40) g.DrawLine(pen, 0, y, W, y);
            }
        }
        else if (fondo == 2)
        {
            using (var b = new LinearGradientBrush(new Rectangle(0, 0, W, H), Color.FromArgb(0, 30, 70), Color.FromArgb(0, 90, 110), 90f)) g.FillRectangle(b, 0, 0, W, H);
            using (var pen = new Pen(Color.FromArgb(40, 180, 255, 255), 2))
                for (int k = 0; k < 6; k++)
                {
                    var pts2 = new PointF[41];
                    for (int i = 0; i <= 40; i++) pts2[i] = new PointF(i * 20, 80 + k * 100 + (float)Math.Sin(i * 0.4 + frames * 0.03 + k) * 12);
                    g.DrawLines(pen, pts2);
                }
        }
        else
        {
            using (var b = new LinearGradientBrush(new Rectangle(0, 0, W, H), Color.FromArgb(20, 0, 0), Color.FromArgb(110, 20, 0), 90f)) g.FillRectangle(b, 0, 0, W, H);
            foreach (var s in estrellas)
            {
                float y = ((s[1] - frames * s[2]) % H + H) % H, r = s[2] * 4;
                using (var b = new SolidBrush(Color.FromArgb(70, 255, 120, 0))) g.FillEllipse(b, s[0] - r, y - r, r * 2, r * 2);
            }
        }
    }

    void Personaje(Graphics g, float x, float y, float r, int s)
    {
        if (s == 0) g.FillRectangle(Brushes.DeepSkyBlue, x - r, y - r, r * 2, r * 2);
        else if (s == 1) g.FillEllipse(Brushes.LimeGreen, x - r, y - r, r * 2, r * 2);
        else if (s == 2) g.FillPolygon(Brushes.HotPink, new[] { new PointF(x, y - r * 1.3f), new PointF(x + r, y), new PointF(x, y + r * 1.3f), new PointF(x - r, y) });
        else if (s == 3)
        {
            var pt = new PointF[10];
            for (int i = 0; i < 10; i++) { double a = -Math.PI / 2 + i * Math.PI / 5; float rr = i % 2 == 0 ? r * 1.4f : r * 0.6f; pt[i] = new PointF(x + (float)Math.Cos(a) * rr, y + (float)Math.Sin(a) * rr); }
            g.FillPolygon(Brushes.Gold, pt);
        }
        else using (var b = new SolidBrush(Hue(frames * 5))) g.FillRectangle(b, x - r, y - r, r * 2, r * 2);
    }

    void Centro(Graphics g, string s, Font f, Brush b, float y)
    {
        var t = g.MeasureString(s, f); g.DrawString(s, f, b, (W - t.Width) / 2, y);
    }

    void Mundo(Graphics g)
    {
        // chispa
        float pul = (float)Math.Sin(frames * 0.15) * 3;
        using (var b = new SolidBrush(Color.FromArgb(60, 255, 215, 0))) g.FillEllipse(b, ch.X - 18 - pul, ch.Y - 18 - pul, 36 + pul * 2, 36 + pul * 2);
        g.FillEllipse(Brushes.Gold, ch.X - 8, ch.Y - 8, 16, 16);
        // poderes
        string[] letra = { "I", "L", "B", "♥" }; Color[] pc = { Color.Cyan, Color.White, Color.Orange, Color.HotPink };
        foreach (var o in pw)
        {
            if (o.vida < 120 && (o.vida / 8) % 2 == 0) continue;
            using (var b = new SolidBrush(pc[o.t])) g.FillEllipse(b, o.x - 13, o.y - 13, 26, 26);
            g.DrawString(letra[o.t], fM, Brushes.Black, o.x - 8, o.y - 13);
        }
        // enemigos
        foreach (var e in en)
        {
            Color c = e.t == 0 ? Color.Crimson : e.t == 1 ? Color.MediumPurple : Color.OrangeRed;
            if (lento > 0) c = Color.SteelBlue;
            using (var b = new SolidBrush(Color.FromArgb(60, c))) g.FillEllipse(b, e.x - e.r - 5, e.y - e.r - 5, e.r * 2 + 10, e.r * 2 + 10);
            using (var b = new SolidBrush(c)) g.FillEllipse(b, e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
        }
        // partículas
        foreach (var q in par) using (var b = new SolidBrush(Color.FromArgb(Math.Min(255, q.v * 6), q.c))) g.FillRectangle(b, q.x - 2, q.y - 2, 4, 4);
        // jugador
        if (escudo > 0 && (escudo > 60 || (escudo / 6) % 2 == 0)) using (var pen = new Pen(Color.Cyan, 2)) g.DrawEllipse(pen, p.X - 17, p.Y - 17, 34, 34);
        if (rad() > 0) using (var pen = new Pen(Color.FromArgb(40, 0, 255, 255))) g.DrawEllipse(pen, p.X - rad(), p.Y - rad(), rad() * 2, rad() * 2);
        if (inv == 0 || (inv / 5) % 2 == 0) Personaje(g, p.X, p.Y, 9, skin);

        // HUD
        g.DrawString("Nivel " + nivel + "     Puntos: " + pts + "     " + new string('♥', Math.Max(0, vidas)), fM, Brushes.White, 10, 8);
        if (combo > 1) g.DrawString("COMBO x" + combo, fM, Brushes.Gold, W - 140, 8);
        g.FillRectangle(Brushes.DimGray, 10, 38, 200, 6);
        int faltan = meta - (meta - (5 + nivel * 2));
        float prog = nivel == 1 ? recog / 6f : 1 - (meta - recog) / (float)(5 + nivel * 2);
        g.FillRectangle(Brushes.Gold, 10, 38, 200 * Math.Max(0, Math.Min(1, prog)), 6);
        g.FillRectangle(Brushes.DimGray, 10, 48, 200, 4);
        g.FillRectangle(dashCd == 0 ? Brushes.White : Brushes.Gray, 10, 48, 200 * (1 - dashCd / (float)dashMax), 4);
        string act = (iman > 0 ? "Imán  " : "") + (lento > 0 ? "Lento  " : "");
        if (act != "") g.DrawString(act, fS, Brushes.Cyan, 220, 34);
    }
    float rad() { return iman > 0 ? 260 : imanRad; }

    void Menu(Graphics g)
    {
        using (var b = new SolidBrush(Color.FromArgb(est == "menu" ? 120 : 175, 0, 0, 0))) g.FillRectangle(b, 0, 0, W, H);
        string tit = "", sub = ""; float y0 = 230, paso = 42;
        switch (est)
        {
            case "menu": tit = "CAZADOR DE CHISPAS"; sub = "Monedas: " + monedas + "     Récord: " + record + "     Mejor nivel: " + nivelRec; break;
            case "pausa": tit = "PAUSA"; break;
            case "mejora": tit = "¡NIVEL " + nivel + "!"; sub = "Elige una mejora para esta partida"; break;
            case "fin": tit = "FIN DE LA PARTIDA"; sub = "Puntos: " + pts + "    Nivel: " + nivel + "    Monedas ganadas: +" + ultGan + (pts >= record && pts > 0 ? "    ¡NUEVO RÉCORD!" : ""); break;
            case "tienda": tit = "TIENDA"; sub = "Monedas: " + monedas; y0 = 150; paso = 32; break;
            case "opciones": tit = "OPCIONES"; break;
            case "logros": tit = "LOGROS"; sub = logros.Count + " de " + logId.Length; y0 = 470; break;
        }
        Centro(g, tit, fT, Brushes.Gold, 50);
        if (sub != "") Centro(g, sub, fM, Brushes.White, 110);
        if (est == "logros")
            for (int i = 0; i < logId.Length; i++)
                Centro(g, (logros.Contains(logId[i]) ? "[✓] " : "[  ] ") + logNom[i] + "   (+" + logPremio[i] + ")", fM, logros.Contains(logId[i]) ? Brushes.LightGreen : Brushes.Gray, 160 + i * 40);
        var op = Opc();
        for (int i = 0; i < op.Length; i++)
            Centro(g, (i == sel ? "▶  " : "") + op[i] + (i == sel ? "  ◀" : ""), fM, i == sel ? Brushes.Gold : Brushes.White, y0 + i * paso);
        if (est == "tienda" && sel < 5) Personaje(g, W - 60, 120, 18, sel);
        if (est == "menu") { Centro(g, "Atrapa chispas doradas, esquiva orbes, sube de nivel y elige mejoras.", fS, Brushes.LightGray, 470); Centro(g, "Gana monedas para comprar personajes, fondos y mejoras permanentes.", fS, Brushes.LightGray, 490); }
        Centro(g, "↑↓ elegir    Enter aceptar    ◀▶ ajustar    Esc volver    M cambiar música    (en juego: Shift/Espacio = dash, Esc = pausa)", fS, Brushes.Gray, H - 28);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias;
        if (temblor > 0) g.TranslateTransform(rnd.Next(-5, 6), rnd.Next(-5, 6));
        Fondo(g);
        if (est == "juego" || est == "pausa" || est == "mejora" || est == "fin") Mundo(g);
        if (est != "juego") Menu(g);
        if (toastT > 0) using (var b = new SolidBrush(Color.FromArgb(Math.Min(220, toastT * 4), 255, 230, 120))) Centro(g, toast, fM, b, H - 70);
    }

    [STAThread]
    static void Main() { Application.EnableVisualStyles(); Application.Run(new Juego()); }
}
