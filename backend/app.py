import subprocess  # nosec B404

def safe_function():
    # Use absolute path to fix B607 and # nosec B603 for hardcoded safe input
    subprocess.run(["/bin/ls", "-l"], check=True)  # nosec B603

if __name__ == "__main__":
    print("Backend is running")
    safe_function()
