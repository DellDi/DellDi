import { execSync } from 'child_process';
import * as moment from 'moment';

interface CommitInfo {
  hash: string;
  date: Date;
  author: string;
  message: string;
}

/**
 * 获取本周编码时长统计
 * 基于Git提交记录分析
 */
class CodingTimeTracker {
  private repoPath: string;
  
  constructor(repoPath: string = '.') {
    this.repoPath = repoPath;
  }

  /**
   * 获取本周的起始和结束日期
   * @returns 包含本周起始和结束日期的对象
   */
  private getWeekRange(): { start: string; end: string } {
    const now = moment();
    const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
    const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');
    
    return { start: startOfWeek, end: endOfWeek };
  }

  /**
   * 获取指定日期范围内的所有提交
   * @param startDate 开始日期 (YYYY-MM-DD)
   * @param endDate 结束日期 (YYYY-MM-DD)
   * @returns 提交信息数组
   */
  private getCommitsBetweenDates(startDate: string, endDate: string): CommitInfo[] {
    try {
      const command = `git -C "${this.repoPath}" log --since="${startDate}" --until="${endDate}" --format="%H|%ad|%an|%s" --date=iso`;
      const output = execSync(command).toString().trim();
      
      if (!output) return [];
      
      return output.split('\n').map(line => {
        const [hash, dateStr, author, message] = line.split('|');
        return {
          hash,
          date: new Date(dateStr),
          author,
          message
        };
      });
    } catch (error) {
      console.error('获取Git提交记录失败:', error);
      return [];
    }
  }

  /**
   * 估算编码时长（基于提交间隔）
   * @param commits 提交记录数组
   * @returns 估算的编码时长（小时）
   */
  private estimateCodingTime(commits: CommitInfo[]): number {
    if (commits.length <= 1) {
      return commits.length * 0.5; // 假设每次提交至少花费30分钟
    }

    // 按时间排序（从旧到新）
    const sortedCommits = [...commits].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let totalHours = 0;
    
    for (let i = 1; i < sortedCommits.length; i++) {
      const prevCommit = sortedCommits[i - 1];
      const currentCommit = sortedCommits[i];
      
      // 计算两次提交之间的时间差（小时）
      const diffHours = (currentCommit.date.getTime() - prevCommit.date.getTime()) / (1000 * 60 * 60);
      
      // 如果间隔小于8小时，认为是连续工作
      // 否则认为是新的工作会话
      if (diffHours < 8) {
        totalHours += Math.min(diffHours, 2); // 最多计算2小时/提交
      } else {
        totalHours += 1; // 假设新会话至少工作1小时
      }
    }
    
    // 加上第一次提交的估算时间
    totalHours += 0.5;
    
    return totalHours;
  }

  /**
   * 获取本周编码时长
   * @returns 本周编码时长（小时）
   */
  public getWeeklyCodingTime(): { hours: number; commits: number; dateRange: { start: string; end: string } } {
    const { start, end } = this.getWeekRange();
    const commits = this.getCommitsBetweenDates(start, end);
    const hours = this.estimateCodingTime(commits);
    
    return {
      hours: parseFloat(hours.toFixed(2)),
      commits: commits.length,
      dateRange: { start, end }
    };
  }

  /**
   * 生成详细报告
   */
  public generateReport(): void {
    const { hours, commits, dateRange } = this.getWeeklyCodingTime();
    
    console.log('\n===== 本周编码时长统计 =====');
    console.log(`日期范围: ${dateRange.start} 至 ${dateRange.end}`);
    console.log(`提交次数: ${commits} 次`);
    console.log(`估算编码时长: ${hours} 小时`);
    console.log('============================\n');
  }
}

// 执行统计
const tracker = new CodingTimeTracker();
tracker.generateReport();

export default CodingTimeTracker;
