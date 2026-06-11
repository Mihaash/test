import subprocess

def safe_function():
    # Fixed Bandit-detectable issue
    subprocess.run(["ls", "-l"], check=True)

if __name__ == "__main__":
    print("Backend is running")
    safe_function()
