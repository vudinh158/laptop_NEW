import re

def rule_cpu_100(cpu: str) -> float:
    s = (cpu or "").lower()
    if any(x in s for x in ["m3 max","m4 max","i9","ryzen 9","ultra 9"]): return 100.0
    if any(x in s for x in ["m3 pro","m4 pro","i7","ryzen 7","ultra 7"]): return 80.0
    if any(x in s for x in ["m3 ","m4 ","i5","ryzen 5","ultra 5"]):       return 60.0
    return 40.0

def rule_gpu_100(gpu: str) -> float:
    g = (gpu or "").lower()
    if any(x in g for x in ["4080","4090","5070","5080","5090","30-core","40-core"]): return 100.0
    if "4070" in g: return 90.0
    if "4060" in g: return 85.0
    if "4050" in g: return 75.0
    if any(x in g for x in ["3050","2050"]): return 60.0
    if any(x in g for x in ["arc","14-core","16-core","18-core"]): return 40.0
    return 20.0

def extract_ram_gb(ram_str: str) -> int:
    m = re.search(r"(\d+)", str(ram_str) or "")
    return int(m.group(1)) if m else 8

def ram_100(ram: str) -> float:
    gb = extract_ram_gb(ram)
    if gb >= 32: return 100.0
    if gb >= 18: return 80.0
    if gb >= 16: return 70.0
    return 40.0

def sto_100(storage: str) -> float:
    s = (storage or "").lower()
    if "4tb" in s:   return 100.0
    if "2tb" in s:   return 90.0
    if "1tb" in s:   return 80.0
    if "512" in s:   return 60.0
    return 40.0
