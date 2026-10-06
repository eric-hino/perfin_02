import sys
from pathlib import Path

PASTA_COLETOR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PASTA_COLETOR))
FIXTURES = Path(__file__).resolve().parent / "fixtures"
