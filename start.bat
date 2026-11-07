@echo off
title Veerendra - Digital Document Management System
color 0b
echo ====================================================================
echo   Veerendra - Digital Document Management System
echo ====================================================================
echo.
echo Starting application server...
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

:: Launch browser after short delay in background
start "" http://localhost:5000

:: Start server
npm start
pause
