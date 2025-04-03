import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment';

interface CodingSession {
  startTime: string;
  endTime: string;
  duration: number; // 以分钟为单位
  files: string[];
}

interface DailyRecord {
  date: string;
  totalMinutes: number;
  sessions: CodingSession[];
}

interface WeeklyRecord {
  startDate: string;
  endDate: string;
  totalMinutes: number;
  dailyRecords: { [date: string]: DailyRecord };
}

export function activate(context: vscode.ExtensionContext) {
  console.log('编码时长追踪器已激活');

  // 存储路径
  const storageDir = context.globalStorageUri.fsPath;
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  const dataFilePath = path.join(storageDir, 'coding-time-data.json');
  
  // 状态变量
  let isTracking = false;
  let currentSession: CodingSession | null = null;
  let lastActivityTime = new Date();
  let activeFiles = new Set<string>();
  let statusBarItem: vscode.StatusBarItem;
  
  // 初始化状态栏
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'coding-time-tracker.showWeeklyReport';
  context.subscriptions.push(statusBarItem);
  
  // 加载现有数据
  let weeklyData: { [weekId: string]: WeeklyRecord } = {};
  if (fs.existsSync(dataFilePath)) {
    try {
      weeklyData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    } catch (e) {
      console.error('无法加载编码时长数据:', e);
      weeklyData = {};
    }
  }
  
  // 保存数据
  const saveData = () => {
    fs.writeFileSync(dataFilePath, JSON.stringify(weeklyData, null, 2));
  };
  
  // 获取当前周ID
  const getCurrentWeekId = (): string => {
    return moment().format('YYYY-[W]ww');
  };
  
  // 获取或创建当前周记录
  const getCurrentWeekRecord = (): WeeklyRecord => {
    const weekId = getCurrentWeekId();
    if (!weeklyData[weekId]) {
      const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
      const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');
      
      weeklyData[weekId] = {
        startDate: startOfWeek,
        endDate: endOfWeek,
        totalMinutes: 0,
        dailyRecords: {}
      };
    }
    return weeklyData[weekId];
  };
  
  // 获取或创建当天记录
  const getTodayRecord = (): DailyRecord => {
    const weekRecord = getCurrentWeekRecord();
    const today = moment().format('YYYY-MM-DD');
    
    if (!weekRecord.dailyRecords[today]) {
      weekRecord.dailyRecords[today] = {
        date: today,
        totalMinutes: 0,
        sessions: []
      };
    }
    
    return weekRecord.dailyRecords[today];
  };
  
  // 开始新会话
  const startSession = () => {
    if (isTracking) return;
    
    isTracking = true;
    lastActivityTime = new Date();
    activeFiles.clear();
    
    if (vscode.window.activeTextEditor) {
      activeFiles.add(vscode.window.activeTextEditor.document.fileName);
    }
    
    currentSession = {
      startTime: new Date().toISOString(),
      endTime: '',
      duration: 0,
      files: []
    };
    
    updateStatusBar();
  };
  
  // 结束当前会话
  const endSession = () => {
    if (!isTracking || !currentSession) return;
    
    isTracking = false;
    const now = new Date();
    
    // 计算持续时间（分钟）
    const durationMs = now.getTime() - new Date(currentSession.startTime).getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    // 只有当会话超过1分钟才记录
    if (durationMinutes >= 1) {
      currentSession.endTime = now.toISOString();
      currentSession.duration = durationMinutes;
      currentSession.files = Array.from(activeFiles);
      
      // 添加到今日记录
      const todayRecord = getTodayRecord();
      todayRecord.sessions.push(currentSession);
      todayRecord.totalMinutes += durationMinutes;
      
      // 更新周记录
      const weekRecord = getCurrentWeekRecord();
      weekRecord.totalMinutes += durationMinutes;
      
      // 保存数据
      saveData();
    }
    
    currentSession = null;
    updateStatusBar();
  };
  
  // 更新状态栏
  const updateStatusBar = () => {
    const weekRecord = getCurrentWeekRecord();
    const weeklyHours = Math.floor(weekRecord.totalMinutes / 60);
    const weeklyMinutes = weekRecord.totalMinutes % 60;
    
    if (isTracking) {
      const sessionMinutes = Math.floor((new Date().getTime() - lastActivityTime.getTime()) / (1000 * 60));
      statusBarItem.text = `$(clock) 本周: ${weeklyHours}h ${weeklyMinutes}m | 当前: ${sessionMinutes}m`;
    } else {
      statusBarItem.text = `$(clock) 本周编码: ${weeklyHours}h ${weeklyMinutes}m`;
    }
    
    statusBarItem.show();
  };
  
  // 检测用户活动
  const checkActivity = () => {
    const idleThresholdMs = 5 * 60 * 1000; // 5分钟无活动视为空闲
    const now = new Date();
    const idleTimeMs = now.getTime() - lastActivityTime.getTime();
    
    if (isTracking && idleTimeMs > idleThresholdMs) {
      // 用户空闲，结束会话
      endSession();
    }
  };
  
  // 注册事件监听
  const onActivity = () => {
    lastActivityTime = new Date();
    
    if (!isTracking) {
      startSession();
    }
    
    // 记录当前文件
    if (vscode.window.activeTextEditor) {
      activeFiles.add(vscode.window.activeTextEditor.document.fileName);
    }
    
    updateStatusBar();
  };
  
  // 注册命令
  const registerCommands = () => {
    // 显示周报告
    context.subscriptions.push(
      vscode.commands.registerCommand('coding-time-tracker.showWeeklyReport', () => {
        const weekRecord = getCurrentWeekRecord();
        const weeklyHours = (weekRecord.totalMinutes / 60).toFixed(1);
        
        // 创建每日统计
        const dailyStats = Object.values(weekRecord.dailyRecords)
          .map(day => `${day.date}: ${(day.totalMinutes / 60).toFixed(1)}小时`)
          .join('\n');
        
        // 显示报告
        vscode.window.showInformationMessage(
          `本周编码时长: ${weeklyHours}小时\n` +
          `周期: ${weekRecord.startDate} 至 ${weekRecord.endDate}\n\n` +
          `每日统计:\n${dailyStats}`,
          { modal: true }
        );
      })
    );
  };
  
  // 设置事件监听器
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(() => onActivity()),
    vscode.window.onDidChangeActiveTextEditor(() => onActivity()),
    vscode.window.onDidChangeTextEditorSelection(() => onActivity())
  );
  
  // 设置定时检查
  const activityInterval = setInterval(checkActivity, 60 * 1000); // 每分钟检查一次
  const updateInterval = setInterval(updateStatusBar, 60 * 1000); // 每分钟更新状态栏
  
  // 注册命令
  registerCommands();
  
  // 初始启动
  updateStatusBar();
  
  // 扩展停用时清理
  context.subscriptions.push({
    dispose: () => {
      clearInterval(activityInterval);
      clearInterval(updateInterval);
      
      if (isTracking) {
        endSession();
      }
    }
  });
}

export function deactivate() {
  console.log('编码时长追踪器已停用');
}
