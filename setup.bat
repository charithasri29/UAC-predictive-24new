@echo off
cd server
call npm install
cd ..\client
call npm install
cd ..
echo Setup complete. Start MongoDB, then run: cd server ^&^& npm run seed ^&^& npm run dev
pause
