import os
import sys

# allows "import utils" as inside the tool containers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
