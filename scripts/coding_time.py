#!/usr/bin/env python3
"""
获取本周编码时长统计工具
基于Git提交记录分析编码时间
"""

import subprocess
import datetime
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass


@dataclass
class CommitInfo:
    """Git提交信息数据类"""
    hash: str
    date: datetime.datetime
    author: str
    message: str


class CodingTimeTracker:
    """编码时长追踪器"""
    
    def __init__(self, repo_path: str = '.'):
        """
        初始化追踪器
        
        Args:
            repo_path: Git仓库路径
        """
        self.repo_path = repo_path
    
    def get_week_range(self) -> Dict[str, str]:
        """
        获取本周的起始和结束日期
        
        Returns:
            包含开始和结束日期的字典
        """
        today = datetime.datetime.now()
        start_of_week = today - datetime.timedelta(days=today.weekday())
        end_of_week = start_of_week + datetime.timedelta(days=6)
        
        return {
            'start': start_of_week.strftime('%Y-%m-%d'),
            'end': end_of_week.strftime('%Y-%m-%d')
        }
    
    def get_commits_between_dates(self, start_date: str, end_date: str) -> List[CommitInfo]:
        """
        获取指定日期范围内的所有提交
        
        Args:
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)
            
        Returns:
            提交信息列表
        """
        try:
            command = f'git -C "{self.repo_path}" log --since="{start_date}" --until="{end_date}" --format="%H|%ad|%an|%s" --date=iso'
            output = subprocess.check_output(command, shell=True, text=True).strip()
            
            if not output:
                return []
            
            commits = []
            for line in output.split('\n'):
                if line:
                    hash_val, date_str, author, message = line.split('|', 3)
                    commits.append(CommitInfo(
                        hash=hash_val,
                        date=datetime.datetime.fromisoformat(date_str.replace(' ', 'T')),
                        author=author,
                        message=message
                    ))
            
            return commits
        except subprocess.CalledProcessError as e:
            print(f"获取Git提交记录失败: {e}")
            return []
    
    def estimate_coding_time(self, commits: List[CommitInfo]) -> float:
        """
        估算编码时长（基于提交间隔）
        
        Args:
            commits: 提交记录列表
            
        Returns:
            估算的编码时长（小时）
        """
        if len(commits) <= 1:
            return len(commits) * 0.5  # 假设每次提交至少花费30分钟
        
        # 按时间排序（从旧到新）
        sorted_commits = sorted(commits, key=lambda c: c.date)
        
        total_hours = 0.0
        
        for i in range(1, len(sorted_commits)):
            prev_commit = sorted_commits[i - 1]
            current_commit = sorted_commits[i]
            
            # 计算两次提交之间的时间差（小时）
            diff_seconds = (current_commit.date - prev_commit.date).total_seconds()
            diff_hours = diff_seconds / 3600
            
            # 如果间隔小于8小时，认为是连续工作
            # 否则认为是新的工作会话
            if diff_hours < 8:
                total_hours += min(diff_hours, 2)  # 最多计算2小时/提交
            else:
                total_hours += 1  # 假设新会话至少工作1小时
        
        # 加上第一次提交的估算时间
        total_hours += 0.5
        
        return total_hours
    
    def get_weekly_coding_time(self) -> Dict[str, Any]:
        """
        获取本周编码时长
        
        Returns:
            包含时长、提交次数和日期范围的字典
        """
        date_range = self.get_week_range()
        commits = self.get_commits_between_dates(date_range['start'], date_range['end'])
        hours = self.estimate_coding_time(commits)
        
        return {
            'hours': round(hours, 2),
            'commits': len(commits),
            'date_range': date_range
        }
    
    def generate_report(self) -> None:
        """生成并打印详细报告"""
        result = self.get_weekly_coding_time()
        
        print("\n===== 本周编码时长统计 =====")
        print(f"日期范围: {result['date_range']['start']} 至 {result['date_range']['end']}")
        print(f"提交次数: {result['commits']} 次")
        print(f"估算编码时长: {result['hours']} 小时")
        print("============================\n")


if __name__ == "__main__":
    tracker = CodingTimeTracker()
    tracker.generate_report()
