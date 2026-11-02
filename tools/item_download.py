import requests
import os
import re

def parse_input(user_input: str):
    """
   convert input to id or id-range
    ex.    "313386" -> [313386]
        "313387-313380" -> [313387, 313386, ..., 313380]
    """
    if "-" in user_input:
        start, end = map(int, user_input.split("-"))
        if start >= end:
            return list(range(start, end - 1, -1))
        else:
            return list(range(start, end + 1))
    else:
        return [int(user_input)]


def download_items(ids, folder="items_download"):
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})
    os.makedirs(folder, exist_ok=True)

    for item_id in ids:
        try:
            saved = False
            # ลองจาก dpRO ก่อน ถ้าไม่พบหรือ 0-byte ให้ลอง throG
            for source in ("dpRO", "throG"):
                url = f"https://www.divine-pride.net/img/items/item/{source}/{item_id}"
                try:
                    resp = session.get(url, timeout=10)
                except requests.RequestException as e:
                    print(f"✘ ข้อผิดพลาดขณะเชื่อมต่อ {item_id} ({source}): {e}")
                    continue

                if resp.status_code == 200 and len(resp.content) > 0:
                    filepath = os.path.join(folder, f"{item_id}.png")
                    try:
                        with open(filepath, "wb") as f:
                            f.write(resp.content)
                        print(f"✔ ดาวน์โหลด {item_id} จาก {source} สำเร็จ -> {filepath}")
                        saved = True
                        break
                    except OSError as e:
                        print(f"✘ ไม่สามารถบันทึกไฟล์ {item_id}: {e}")
                        saved = True  # หยุดลองแหล่งอื่นเพราะตอบ 200 แต่เขียนไฟล์ล้มเหลว
                        break
                else:
                    # ถ้า dpRO ได้ 200 แต่ content 0 ให้ระบุ จะลอง throG
                    if resp.status_code == 200 and len(resp.content) == 0:
                        print(f"⚠ ไฟล์เปล่า (0 byte) สำหรับ {item_id} จาก {source} — กำลังลองแหล่งสำรอง...")
                    else:
                        print(f"✘ ไม่พบไฟล์: {item_id} ({source}) (HTTP {resp.status_code})")
            if not saved:
                print(f"✘ ไม่พบภาพสำหรับ {item_id} ทั้ง dpRO และ throG")
        except Exception as e:
            # เก็บข้อผิดพลาดที่ไม่คาดคิด แล้วไปไอเท็มถัดไป
            print(f"✘ เกิดข้อผิดพลาดสำหรับ {item_id}: {e} — ข้ามไปถัดไป")


if __name__ == "__main__":
    user_input = input("give itemid or range ex. 313386 or 313387-313380: ")
    try:
        ids = parse_input(user_input)
    except ValueError as e:
        print(f"✘ ข้อผิดพลาด: {e}")
        #raise SystemExit(1)
    download_items(ids)