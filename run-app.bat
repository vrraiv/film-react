@echo off
setlocal

pushd "%~dp0"

if not exist "package.json" (
  echo Could not find package.json in "%~dp0"
  popd
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency install failed.
    popd
    exit /b 1
  )
)

echo Starting film-react with Netlify Dev...
echo Use the Netlify Dev URL shown below, usually http://localhost:8888/
call npm.cmd run dev:netlify
set EXIT_CODE=%ERRORLEVEL%

popd
exit /b %EXIT_CODE%
