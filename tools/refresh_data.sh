#!/usr/bin/env bash
set -euo pipefail

REMOTE="${KP_REMOTE:-root@37.27.43.203}"
REMOTE_OUT="${KP_REMOTE_OUT:-/root/out_v4}"
HOST="https://www.knockportal.com"
SITE="$(cd "$(dirname "$0")/.." && pwd)"
LIVE="$SITE/public/data"
BAK="$SITE/.data_backups"
STAGE="$BAK/staging"
TS="$(date +%Y%m%d-%H%M%S)"
SSHO=(-o ControlMaster=auto -o ControlPath=/tmp/kp-%r@%h:%p -o ControlPersist=120)

say(){ printf '\n== %s ==\n' "$1"; }
meta(){ python3 -c "import json,sys;print(json.load(open(sys.argv[1]+'/clusters.json'))['meta']['generated'])" "$1"; }

case "${1:-}" in
--rollback)
  OLD="$(ls -dt "$BAK"/data.old.* 2>/dev/null | head -1 || true)"
  [ -n "$OLD" ] || { echo "нет резервных каталогов в $BAK"; exit 1; }
  mv "$LIVE" "$BAK/data.rolledback.$TS"
  cp -R "$OLD" "$LIVE"
  ( cd "$SITE/tools" && python3 build_pages.py --site "$SITE" >/dev/null )
  echo "откат на $(meta "$LIVE") выполнен, страницы пересобраны"
  echo "внимание: если срез уже опубликован, откат локальный — нужен ещё --publish"
  exit 0 ;;
--publish)
  cd "$SITE"
  GEN="$(meta "$LIVE")"
  [ -n "$(git status --porcelain public/data public/sf)" ] || { echo "нечего публиковать: локальный срез $GEN уже совпадает с опубликованным"; exit 0; }
  say "к публикации"
  git status --short public/data public/sf
  echo "срез: $GEN · файлов: $(git status --porcelain public/data public/sf | wc -l | tr -d ' ')"
  printf 'публиковать? напиши yes: '
  read -r ANS; [ "$ANS" = "yes" ] || { echo "отменено"; exit 1; }
  git add public/data public/sf
  git commit -q -m "data: refresh to $GEN"
  git push origin main
  say "жду прод (до 4 мин)"
  for i in $(seq 1 24); do
    P="$(curl -s "$HOST/data/clusters.json" | python3 -c "import json,sys;print(json.load(sys.stdin)['meta']['generated'])" 2>/dev/null || echo "-")"
    if [ "$P" = "$GEN" ]; then echo "✅ прод отдаёт $P"; \
      curl -s -o /dev/null -w "страница: %{http_code}\n" "$HOST/sf/mike-mccurdy-roofing"; exit 0; fi
    printf '.'; sleep 10
  done
  echo; echo "⚠ прод всё ещё отдаёт '$P' — смотри сборку в Vercel"; exit 1 ;;
esac

if [ "${1:-}" = "--run" ]; then
  say "0. запуск прогона на VPS (несколько минут)"
  BEFORE="$(ssh "${SSHO[@]}" "$REMOTE" "stat -c %Y $REMOTE_OUT/clusters.json 2>/dev/null || echo 0")"
  ssh "${SSHO[@]}" "$REMOTE" "cd /root && rm -f /tmp/kp_run.done && nohup bash -c 'flock -n /tmp/kp_clusters.lock -c \". ~/kp-venv/bin/activate && python3 sf_live_clusters_v3.py --days 30 --out $REMOTE_OUT\"; echo \$? > /tmp/kp_run.done' > /tmp/kp_run.log 2>&1 < /dev/null &" \
    || { echo "СТОП: не удалось запустить прогон"; exit 1; }
  echo -n "прогон идёт"
  for i in $(seq 1 60); do
    RC="$(ssh "${SSHO[@]}" "$REMOTE" "cat /tmp/kp_run.done 2>/dev/null || true")"
    [ -n "$RC" ] && break
    printf '.'; sleep 10
  done
  echo
  [ -n "${RC:-}" ] || { echo "СТОП: прогон не завершился за 10 минут; лог: ssh $REMOTE tail -30 /tmp/kp_run.log"; exit 1; }
  ssh "${SSHO[@]}" "$REMOTE" "grep -E 'permits pulled|geocoded|legacy:|new feed:|neighbourhoods with|files ->' /tmp/kp_run.log"
  [ "$RC" = "0" ] || { echo "СТОП: прогон вернул код $RC"; ssh "${SSHO[@]}" "$REMOTE" "tail -20 /tmp/kp_run.log"; exit 1; }
  AFTER="$(ssh "${SSHO[@]}" "$REMOTE" "stat -c %Y $REMOTE_OUT/clusters.json 2>/dev/null || echo 0")"
  [ "$AFTER" -gt "$BEFORE" ] || { echo "СТОП: clusters.json не обновился ($BEFORE -> $AFTER) — скрипт отработал мимо $REMOTE_OUT"; exit 1; }
  echo "прогон записал новый clusters.json"
fi

say "1. прогон на VPS: $REMOTE:$REMOTE_OUT"
ssh "${SSHO[@]}" "$REMOTE" "ls -la $REMOTE_OUT/clusters.json" || {
  echo "СТОП: не найден clusters.json. Что лежит рядом:"
  ssh "${SSHO[@]}" "$REMOTE" "ls -dt /root/out* /root/*/out* 2>/dev/null | head -10"
  echo "запусти так:  KP_REMOTE_OUT=/фактический/путь ./tools/refresh_data.sh"; exit 1; }

mkdir -p "$BAK"; rm -rf "$STAGE"; mkdir -p "$STAGE"
scp "${SSHO[@]}" -q "$REMOTE:$REMOTE_OUT/clusters.json" "$STAGE/clusters.json"

IDS="$(python3 - "$STAGE/clusters.json" <<'PY'
import json,sys,re
d=json.load(open(sys.argv[1])); m=d["meta"]
ids=[str(c["cluster"]) for c in d["clusters"]]
assert all(re.fullmatch(r"\d+",i) for i in ids), "нецифровой cluster id"
assert len(ids)==m["clusters"], f"индекс {len(ids)} против meta {m['clusters']}"
print(" ".join(ids))
PY
)"

say "2. забор только перечисленных в индексе"
FILES=""; for i in $IDS; do FILES="$FILES cluster_$i.json"; done
ssh "${SSHO[@]}" "$REMOTE" "cd $REMOTE_OUT && tar czf - $FILES" | tar xzf - -C "$STAGE"

say "3. валидация нового каталога"
python3 - "$STAGE" <<'PY'
import json,os,sys,datetime
st=sys.argv[1]
d=json.load(open(os.path.join(st,"clusters.json"))); m=d["meta"]
ids=[str(c["cluster"]) for c in d["clusters"]]
want={"clusters.json"}|{f"cluster_{i}.json" for i in ids}
have=set(os.listdir(st))
if want-have: sys.exit(f"СТОП: не хватает {sorted(want-have)[:5]}")
if have-want: sys.exit(f"СТОП: лишнее {sorted(have-want)[:5]}")
n=sum(len(json.load(open(os.path.join(st,f"cluster_{i}.json")))["neighbours"]) for i in ids)
age=(datetime.datetime.now(datetime.timezone.utc)-datetime.datetime.strptime(m["generated"][:16],"%Y-%m-%d %H:%M").replace(tzinfo=datetime.timezone.utc)).total_seconds()/3600
print(f"файлов {len(have)} · кластеров {m['clusters']} · пермитов {m['permits_in_clusters']} · соседей {n}")
print(f"срез {m['generated']} · возраст {age:.1f} ч" + ("  ⚠ СТАРШЕ 48 Ч" if age>48 else ""))
PY

say "4. подмена каталога"
OLDGEN="$(meta "$LIVE" 2>/dev/null || echo "нет")"
cp -R "$LIVE" "$BAK/data.old.$TS"
rm -rf "$LIVE"
mv "$STAGE" "$LIVE" || { cp -R "$BAK/data.old.$TS" "$LIVE"; echo "СТОП: подмена не удалась, откат сделан"; exit 1; }
ls -dt "$BAK"/data.old.* 2>/dev/null | tail -n +4 | xargs -I{} rm -rf {}

say "5. пересборка страниц"
( cd "$SITE/tools" && python3 build_pages.py --site "$SITE" | tail -3 )

say "6. сверка страниц с данными"
python3 - "$SITE" <<'PY'
import json,os,re,sys,glob
site=sys.argv[1]
m=json.load(open(f"{site}/public/data/clusters.json"))["meta"]
pages=sorted(glob.glob(f"{site}/public/sf/*.html")); bad=[]
for p in pages:
    h=open(p,encoding="utf-8").read()
    if re.search(r"__[A-Z_]+__",h): bad.append((p,"плейсхолдер"))
    if f"<b>{m['permits_in_clusters']} roofing permits</b>" not in h: bad.append((p,"пермиты"))
    if f"<b>{m['clusters']} clusters</b>" not in h: bad.append((p,"кластеры"))
    if m["generated"] not in h: bad.append((p,"дата среза"))
print(f"страниц {len(pages)} · расхождений {len(bad)}")
for p,w in bad[:5]: print("  !",os.path.basename(p),w)
if bad or len(pages)!=25: sys.exit("СТОП: страницы не соответствуют данным")
PY

say "ИТОГ"
echo "было:  $OLDGEN"
echo "стало: $(meta "$LIVE")"
git -C "$SITE" status --short public/data public/sf | head -5
echo "файлов к коммиту: $(git -C "$SITE" status --porcelain public/data public/sf | wc -l | tr -d ' ')"
echo
echo "с новым прогоном: ./tools/refresh_data.sh --run"
echo "публикация: ./tools/refresh_data.sh --publish   (спросит подтверждение)"
echo "откат:      ./tools/refresh_data.sh --rollback  (резерв: $BAK/data.old.$TS)"
