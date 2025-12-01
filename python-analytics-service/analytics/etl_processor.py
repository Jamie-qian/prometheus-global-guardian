#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL数据处理器 - 替代TypeScript的数据转换逻辑
实现Extract-Transform-Load完整流程
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any
import logging
from datetime import datetime

class ETLProcessor:
    """ETL数据流水线处理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    def convert_to_dataframe(self, hazards: List[Dict]) -> pd.DataFrame:
        """将JSON数据转换为Pandas DataFrame"""
        try:
            if not hazards:
                return pd.DataFrame()
            
            df = pd.DataFrame(hazards)
            
            # 数据类型转换
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            if 'magnitude' in df.columns:
                df['magnitude'] = pd.to_numeric(df['magnitude'], errors='coerce')
            
            if 'populationExposed' in df.columns:
                df['populationExposed'] = pd.to_numeric(df['populationExposed'], errors='coerce')
            
            return df
            
        except Exception as e:
            self.logger.error(f"DataFrame conversion failed: {e}")
            raise
    
    def process_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform阶段：数据清洗、标准化、去重"""
        try:
            # 1. 去除重复数据
            df = df.drop_duplicates(subset=['id'], keep='first')
            
            # 2. 处理缺失值
            df = self._handle_missing_values(df)
            
            # 3. 异常值检测与修复
            df = self._handle_outliers(df)
            
            # 4. 数据标准化
            df = self._standardize_data(df)
            
            return df
            
        except Exception as e:
            self.logger.error(f"Data processing failed: {e}")
            raise
    
    def assess_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """评估数据质量"""
        try:
            total_records = len(df)
            
            if total_records == 0:
                return {"overallScore": 0, "status": "no_data"}
            
            # 质量检查项
            quality_checks = {
                "completeness": self._check_completeness(df),
                "accuracy": self._check_accuracy(df),
                "consistency": self._check_consistency(df),
                "validity": self._check_validity(df),
                "timeliness": self._check_timeliness(df)
            }
            
            # 计算总分
            overall_score = np.mean(list(quality_checks.values())) * 100
            
            return {
                "overallScore": round(overall_score, 1),
                "targetScore": 99.8,  # 目标准确率
                "detailChecks": quality_checks,
                "totalRecords": total_records,
                "status": "excellent" if overall_score >= 98 else ("good" if overall_score >= 90 else "needs_improvement")
            }
            
        except Exception as e:
            self.logger.error(f"Quality assessment failed: {e}")
            return {"error": str(e)}
    
    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """处理缺失值"""
        # magnitude缺失值用中位数填充
        if 'magnitude' in df.columns:
            median_magnitude = df['magnitude'].median()
            df['magnitude'].fillna(median_magnitude, inplace=True)
        
        # severity缺失值用默认值
        if 'severity' in df.columns:
            df['severity'].fillna('UNKNOWN', inplace=True)
        
        return df
    
    def _handle_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """处理异常值 - 使用3σ原则"""
        if 'magnitude' in df.columns:
            magnitude_data = df['magnitude'].dropna()
            if len(magnitude_data) > 2:
                mean = magnitude_data.mean()
                std = magnitude_data.std()
                
                # 3σ原则：超出±3σ的值视为异常
                lower_bound = mean - 3 * std
                upper_bound = mean + 3 * std
                
                # 将异常值替换为边界值
                df.loc[df['magnitude'] < lower_bound, 'magnitude'] = lower_bound
                df.loc[df['magnitude'] > upper_bound, 'magnitude'] = upper_bound
        
        return df
    
    def _standardize_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """数据标准化"""
        # 统一类型命名
        type_mapping = {
            'earthquake': 'EARTHQUAKE',
            'volcano': 'VOLCANO',
            'storm': 'STORM',
            'flood': 'FLOOD',
            'wildfire': 'WILDFIRE'
        }
        
        if 'type' in df.columns:
            df['type'] = df['type'].str.upper()
            df['type'] = df['type'].replace(type_mapping)
        
        return df
    
    def _check_completeness(self, df: pd.DataFrame) -> float:
        """检查数据完整性"""
        required_fields = ['id', 'type', 'timestamp', 'coordinates']
        completeness_scores = []
        
        for field in required_fields:
            if field in df.columns:
                non_null_ratio = df[field].notna().sum() / len(df)
                completeness_scores.append(non_null_ratio)
        
        return np.mean(completeness_scores) if completeness_scores else 0.0
    
    def _check_accuracy(self, df: pd.DataFrame) -> float:
        """检查数据准确性"""
        # 时间戳格式准确性
        if 'timestamp' in df.columns:
            valid_timestamps = pd.to_datetime(df['timestamp'], errors='coerce').notna().sum()
            return valid_timestamps / len(df)
        return 1.0
    
    def _check_consistency(self, df: pd.DataFrame) -> float:
        """检查数据一致性"""
        # 检查类型一致性
        if 'type' in df.columns:
            valid_types = ['EARTHQUAKE', 'VOLCANO', 'STORM', 'FLOOD', 'WILDFIRE', 
                          'HURRICANE', 'TYPHOON', 'DROUGHT', 'LANDSLIDE']
            consistent = df['type'].isin(valid_types).sum()
            return consistent / len(df)
        return 1.0
    
    def _check_validity(self, df: pd.DataFrame) -> float:
        """检查数据有效性"""
        validity_score = 1.0
        
        # 震级有效性（0-10）
        if 'magnitude' in df.columns:
            valid_magnitude = df['magnitude'].between(0, 10, inclusive='both').sum()
            validity_score *= (valid_magnitude / len(df[df['magnitude'].notna()]))
        
        return validity_score
    
    def _check_timeliness(self, df: pd.DataFrame) -> float:
        """检查数据时效性"""
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
            recent_data = df[df['timestamp'] > (datetime.now() - pd.Timedelta(days=90))]
            return len(recent_data) / len(df) if len(df) > 0 else 0.0
        return 1.0
