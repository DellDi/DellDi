#!/usr/bin/env ts-node
/**
 * 快速获取本周编码时长
 * 基于文件修改时间统计
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as moment from 'moment';

interface FileStats {
  path: string;
  lastModified: Date;
  extension: string;
}

class QuickCodingTimeTracker {
  private projectPath: string;
  private codeExtensions: string[] = [
    // 前端
    '.ts', '.tsx', '.js', '.jsx', '.vue', '.css', '.scss', '.html',
    // 后端
    '.py', '.go', '.java', '.php', '.rb',
    // 配置文件
    '.json', '.yml', '.yaml', '.toml'
  ];
  
  constructor(projectPath: string = '.') {
    this.projectPath = path.resolve(projectPath);
  }
  
  /**
   * 获取本周的起始和结束时间戳
   */
  private getWeekTimeRange(): { start: number; end: number } {
    const now = moment();
    const startOfWeek = moment().startOf('week').unix();
    const endOfWeek = moment().endOf('week').unix();
    
    return { start: startOfWeek, end: endOfWeek };
  }
  
  /**
   * 获取本周修改过的代码文件
   */
  private getModifiedFiles(): FileStats[] {
    try {
      const { start } = this.getWeekTimeRange();
      
      // 使用find命令查找本周修改过的文件
      const command = `find "${this.projectPath}" -type f -newermt "@${start}" | grep -v "node_modules\\|.git\\|dist\\|build"`;
      const output = execSync(command).toString().trim();
      
      if (!output) return [];
      
      return output.split('\n')
        .filter(filePath => {
          const ext = path.extname(filePath).toLowerCase();
          return this.codeExtensions.includes(ext);
        })
        .map(filePath => {
          // 获取文件最后修改时间
          const statCommand = `stat -f "%m" "${filePath}"`;
          const mtime = parseInt(execSync(statCommand).toString().trim());
          
          return {
            path: filePath,
            lastModified: new Date(mtime * 1000),
            extension: path.extname(filePath).toLowerCase()
          };
        });
    } catch (error) {
      console.error('获取文件列表失败:', error);
      return [];
    }
  }
  
  /**
   * 估算编码时长
   */
  private estimateCodingTime(files: FileStats[]): number {
    if (files.length === 0) return 0;
    
    // 按修改时间排序
    const sortedFiles = [...files].sort((a, b) => 
      a.lastModified.getTime() - b.lastModified.getTime()
    );
    
    // 按小时分组文件修改
    const hourlyGroups: { [hour: string]: number } = {};
    
    sortedFiles.forEach(file => {
      const hourKey = moment(file.lastModified).format('YYYY-MM-DD-HH');
      hourlyGroups[hourKey] = (hourlyGroups[hourKey] || 0) + 1;
    });
    
    // 估算每小时的编码时间（分钟）
    const hourEstimates = Object.entries(hourlyGroups).map(([hour, count]) => {
      // 基本假设：每小时最多40分钟有效编码时间
      // 文件修改数量越多，编码时间越接近40分钟
      const minutes = Math.min(40, 10 + count * 2);
      return { hour, minutes };
    });
    
    // 计算总时间（小时）
    const totalMinutes = hourEstimates.reduce((sum, { minutes }) => sum + minutes, 0);
    return totalMinutes / 60;
  }
  
  /**
   * 按文件类型统计
   */
  private getFileTypeStats(files: FileStats[]): { [ext: string]: number } {
    const stats: { [ext: string]: number } = {};
    
    files.forEach(file => {
      const ext = file.extension;
      stats[ext] = (stats[ext] || 0) + 1;
    });
    
    return stats;
  }
  
  /**
   * 生成本周编码报告
   */
  public generateWeeklyReport(): void {
    const { start, end } = this.getWeekTimeRange();
    const startDate = moment.unix(start).format('YYYY-MM-DD');
    const endDate = moment.unix(end).format('YYYY-MM-DD');
    
    console.log('\n===== 本周快速编码时长统计 =====');
    console.log(`日期范围: ${startDate} 至 ${endDate}`);
    
    const files = this.getModifiedFiles();
    const hours = this.estimateCodingTime(files);
    const typeStats = this.getFileTypeStats(files);
    
    console.log(`修改文件数: ${files.length} 个`);
    console.log(`估算编码时长: ${hours.toFixed(1)} 小时`);
    
    console.log('\n文件类型分布:');
    Object.entries(typeStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ext, count]) => {
        console.log(`  ${ext}: ${count} 个文件`);
      });
    
    console.log('================================\n');
  }
}

// 执行统计
const tracker = new QuickCodingTimeTracker();
tracker.generateWeeklyReport();

export default QuickCodingTimeTracker;
