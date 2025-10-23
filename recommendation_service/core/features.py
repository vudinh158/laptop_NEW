import pandas as pd
from .bench import lookup_cpu_raw, lookup_gpu_raw, scale_0_100, CPU_P5, CPU_P95, GPU_P5, GPU_P95
from .rules import rule_cpu_100, rule_gpu_100, ram_100, sto_100

def calculate_perf_from_mapping_or_rule(row: pd.Series):
    """
    Trả về: (score, cpu_src, gpu_src, cpu100, gpu100)
    """
    cpu_name = str(row.get("processor", ""))
    gpu_name = str(row.get("graphics_card", ""))

    cpu_raw, cpu_src = lookup_cpu_raw(cpu_name)
    gpu_raw, gpu_src = lookup_gpu_raw(gpu_name)

    cpu100 = scale_0_100(cpu_raw, CPU_P5, CPU_P95) if cpu_raw is not None else rule_cpu_100(cpu_name)
    gpu100 = scale_0_100(gpu_raw, GPU_P5, GPU_P95) if gpu_raw is not None else rule_gpu_100(gpu_name)

    if cpu_raw is None: cpu_src = "rule"
    if gpu_raw is None: gpu_src = "rule"

    ram100 = ram_100(row.get("ram", ""))
    sto100 = sto_100(row.get("storage", ""))

    score = round(0.40 * cpu100 + 0.35 * gpu100 + 0.15 * ram100 + 0.10 * sto100, 2)
    return score, cpu_src, gpu_src, cpu100, gpu100
