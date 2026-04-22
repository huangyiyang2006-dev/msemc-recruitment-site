from __future__ import annotations

import base64
import csv
import io
import json
import os
import socket
import sqlite3
from binascii import Error as BinasciiError
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("DATA_DIR", str(ROOT_DIR / "data")))
DB_PATH = DATA_DIR / "signups.db"
MAX_BODY_BYTES = 256_000
ALLOWED_DEPARTMENTS = ("采编策划", "视觉设计", "摄影摄像", "运营统筹")
LOCAL_ONLY_PATHS = {"/admin.html", "/admin.css", "/admin.js"}
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip()
IS_PUBLIC_ADMIN_ENABLED = bool(ADMIN_PASSWORD)
DEFAULT_HOST = os.environ.get("HOST", "0.0.0.0")
DEFAULT_PORT = int(os.environ.get("PORT", "8000"))


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def get_lan_ip() -> str | None:
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(("192.0.2.1", 80))
        return probe.getsockname()[0]
    except OSError:
        return None
    finally:
        probe.close()


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS signups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                class_name TEXT NOT NULL,
                student_id TEXT NOT NULL,
                major TEXT NOT NULL,
                first_choice TEXT NOT NULL,
                second_choice TEXT NOT NULL,
                third_choice TEXT NOT NULL,
                resume TEXT NOT NULL,
                skills_json TEXT NOT NULL,
                awards_json TEXT NOT NULL,
                message TEXT NOT NULL,
                submitted_at TEXT NOT NULL,
                remote_addr TEXT NOT NULL,
                user_agent TEXT NOT NULL
            )
            """
        )


def clean_text(value: object, *, field_name: str, max_length: int, required: bool = True) -> str:
    text = str(value or "").strip()
    if required and not text:
        raise ValueError(f"{field_name}不能为空。")
    if len(text) > max_length:
        raise ValueError(f"{field_name}长度不能超过 {max_length} 个字符。")
    return text


def clean_tag_list(value: object, *, field_name: str, max_items: int = 30, item_max_length: int = 100) -> list[str]:
    if value in (None, ""):
        return []
    if not isinstance(value, list):
        raise ValueError(f"{field_name}格式不正确。")

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in value[:max_items]:
        # Keep lists clean and stable when rendering in admin.
        text = clean_text(item, field_name=field_name, max_length=item_max_length, required=True)
        if text not in seen:
            seen.add(text)
            cleaned.append(text)
    return cleaned


def validate_submission(payload: object, remote_addr: str, user_agent: str) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise ValueError("请求数据格式不正确。")

    first_choice = clean_text(payload.get("firstChoice"), field_name="第一志愿", max_length=20)
    second_choice = clean_text(payload.get("secondChoice"), field_name="第二志愿", max_length=20)
    third_choice = clean_text(payload.get("thirdChoice"), field_name="第三志愿", max_length=20)
    choices = [first_choice, second_choice, third_choice]

    if any(choice not in ALLOWED_DEPARTMENTS for choice in choices):
        raise ValueError("志愿部门不在允许范围内。")
    if len(set(choices)) != len(choices):
        raise ValueError("第一、第二、第三志愿不能重复。")

    skills = clean_tag_list(payload.get("skills"), field_name="擅长技能")
    awards = clean_tag_list(payload.get("awards"), field_name="获奖经历")

    if not skills:
        raise ValueError("请至少填写 1 项擅长技能。")

    return {
        "name": clean_text(payload.get("name"), field_name="姓名", max_length=40),
        "class_name": clean_text(payload.get("className"), field_name="班级", max_length=60),
        "student_id": clean_text(payload.get("studentId"), field_name="学号", max_length=40),
        "major": clean_text(payload.get("major"), field_name="专业", max_length=80),
        "first_choice": first_choice,
        "second_choice": second_choice,
        "third_choice": third_choice,
        "resume": clean_text(payload.get("resume"), field_name="个人简历", max_length=3000),
        "skills": skills,
        "awards": awards,
        "message": clean_text(payload.get("message"), field_name="补充说明", max_length=2000, required=False),
        "submitted_at": utc_now_iso(),
        "remote_addr": clean_text(remote_addr, field_name="IP地址", max_length=120),
        "user_agent": clean_text(user_agent, field_name="浏览器信息", max_length=500, required=False),
    }


def insert_submission(submission: dict[str, object]) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO signups (
                name, class_name, student_id, major,
                first_choice, second_choice, third_choice,
                resume, skills_json, awards_json, message,
                submitted_at, remote_addr, user_agent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                submission["name"],
                submission["class_name"],
                submission["student_id"],
                submission["major"],
                submission["first_choice"],
                submission["second_choice"],
                submission["third_choice"],
                submission["resume"],
                json.dumps(submission["skills"], ensure_ascii=False),
                json.dumps(submission["awards"], ensure_ascii=False),
                submission["message"],
                submission["submitted_at"],
                submission["remote_addr"],
                submission["user_agent"],
            ),
        )


def list_submissions() -> list[dict[str, object]]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT
                id, name, class_name, student_id, major,
                first_choice, second_choice, third_choice,
                resume, skills_json, awards_json, message,
                submitted_at
            FROM signups
            ORDER BY id DESC
            """
        ).fetchall()

    results: list[dict[str, object]] = []
    for row in rows:
        results.append(
            {
                "id": row["id"],
                "name": row["name"],
                "className": row["class_name"],
                "studentId": row["student_id"],
                "major": row["major"],
                "firstChoice": row["first_choice"],
                "secondChoice": row["second_choice"],
                "thirdChoice": row["third_choice"],
                "resume": row["resume"],
                "skills": json.loads(row["skills_json"] or "[]"),
                "awards": json.loads(row["awards_json"] or "[]"),
                "message": row["message"],
                "submittedAt": row["submitted_at"],
            }
        )
    return results


def export_csv(rows: list[dict[str, object]]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "ID",
            "提交时间",
            "姓名",
            "班级",
            "学号",
            "专业",
            "第一志愿",
            "第二志愿",
            "第三志愿",
            "擅长技能",
            "曾获奖项",
            "个人简历",
            "补充说明/作品链接",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row["id"],
                row["submittedAt"],
                row["name"],
                row["className"],
                row["studentId"],
                row["major"],
                row["firstChoice"],
                row["secondChoice"],
                row["thirdChoice"],
                "；".join(row["skills"]),
                "；".join(row["awards"]),
                row["resume"],
                row["message"],
            ]
        )
    return buffer.getvalue()


class MediaCenterHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "same-origin")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {self.address_string()} {format % args}")

    def send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_text(self, status: int, body: str, *, content_type: str = "text/plain; charset=utf-8") -> None:
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def is_local_request(self) -> bool:
        host = self.client_address[0]
        return host in {"127.0.0.1", "::1", "::ffff:127.0.0.1"}

    def parse_basic_auth(self) -> tuple[str, str] | None:
        authorization = self.headers.get("Authorization", "")
        if not authorization.startswith("Basic "):
            return None

        encoded = authorization[6:].strip()
        try:
            decoded = base64.b64decode(encoded).decode("utf-8")
        except (ValueError, UnicodeDecodeError, BinasciiError):
            return None

        if ":" not in decoded:
            return None
        return tuple(decoded.split(":", 1))  # type: ignore[return-value]

    def is_admin_authorized(self) -> bool:
        if not IS_PUBLIC_ADMIN_ENABLED:
            return self.is_local_request()

        credentials = self.parse_basic_auth()
        if not credentials:
            return False

        username, password = credentials
        return username == ADMIN_USERNAME and password == ADMIN_PASSWORD

    def require_admin_access(self) -> bool:
        if self.is_admin_authorized():
            return True

        self.send_response(HTTPStatus.UNAUTHORIZED)
        self.send_header('WWW-Authenticate', 'Basic realm="MSEMC Admin"')
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        body = "管理页面需要授权后访问。".encode("utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        return False

    def read_json_body(self) -> dict[str, object]:
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        if content_length <= 0:
            raise ValueError("请求体为空。")
        if content_length > MAX_BODY_BYTES:
            raise ValueError("请求内容过大。")
        raw = self.rfile.read(content_length)
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("请求 JSON 格式不正确。") from exc

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/signups":
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return

        try:
            payload = self.read_json_body()
            submission = validate_submission(
                payload,
                remote_addr=self.client_address[0],
                user_agent=self.headers.get("User-Agent", ""),
            )
            insert_submission(submission)
        except ValueError as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": str(exc)})
            return
        except Exception:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "message": "服务器保存报名信息时出错。"})
            return

        self.send_json(
            HTTPStatus.CREATED,
            {
                "ok": True,
                "message": "报名信息已提交到本机管理端。",
                "submittedAt": submission["submitted_at"],
            },
        )

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            self.send_json(HTTPStatus.OK, {"ok": True})
            return

        if path == "/api/admin/signups":
            if not self.require_admin_access():
                return
            self.send_json(HTTPStatus.OK, {"ok": True, "items": list_submissions()})
            return

        if path == "/api/admin/signups.csv":
            if not self.require_admin_access():
                return
            csv_text = export_csv(list_submissions())
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="media-center-signups.csv"')
            encoded = csv_text.encode("utf-8-sig")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
            return

        if path == "/":
            self.path = "/index.html"
            return super().do_GET()

        if path in LOCAL_ONLY_PATHS:
            if not self.require_admin_access():
                return

        return super().do_GET()


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def create_server(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> ReusableThreadingHTTPServer:
    init_db()
    return ReusableThreadingHTTPServer((host, port), MediaCenterHandler)


def main() -> None:
    server = create_server()
    host, port = server.server_address
    lan_ip = get_lan_ip()

    print("中国石油大学（华东）材料科学与工程学院大学生传媒中心报名服务已启动")
    print(f"本机报名页: http://127.0.0.1:{port}/")
    if IS_PUBLIC_ADMIN_ENABLED:
        print(f"管理页: http://127.0.0.1:{port}/admin.html")
        print(f"管理账号: {ADMIN_USERNAME}")
        print("管理密码: 使用环境变量 ADMIN_PASSWORD 中配置的值")
    else:
        print(f"本机管理页: http://127.0.0.1:{port}/admin.html")
    if lan_ip:
        print(f"局域网报名页: http://{lan_ip}:{port}/")
    if IS_PUBLIC_ADMIN_ENABLED:
        print("提示: 管理页已启用账号密码保护，可在部署后从固定网址访问。")
    else:
        print("提示: 当前未配置管理密码，管理页只允许在这台电脑上通过 localhost 打开。")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
