@echo off
echo.
echo ========================================
echo   AI Tools Hub - Installation Script
echo ========================================
echo.

:: Check Node.js
echo Checking Node.js version...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 18 or higher from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%
echo.

:: Install dependencies
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [OK] Dependencies installed successfully!
echo.

:: Setup .env file
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env >nul
    echo [OK] .env file created!
    echo.
    echo [IMPORTANT] Add your Gemini API key to .env file
    echo Get your API key from: https://makersuite.google.com/app/apikey
    echo Edit .env and replace 'your_gemini_api_key_here' with your actual key
) else (
    echo [OK] .env file already exists
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Add your Gemini API key to .env file
echo 2. Run 'npm run dev' to start the development server
echo 3. Open http://localhost:3000 in your browser
echo.
echo Documentation:
echo - README.md - Main documentation
echo - QUICKSTART.md - Quick setup guide
echo - ARCHITECTURE.md - Technical details
echo - CONTRIBUTING.md - How to add new tools
echo - DEPLOYMENT.md - Production deployment
echo.
echo Happy coding! ^_^
echo.
pause
