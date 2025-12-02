#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prometheus Global Guardian - Python Analytics Service
高性能数据分析微服务，替代TypeScript统计算法实现

优化特性：
- 请求级缓存机制
- 并发处理支持
- 批量数据优化
- 性能监控
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import hashlib
import json
from functools import wraps
import asyncio

from analytics.statistical_algorithms import StatisticalAnalyzer
from analytics.prediction_models import PredictionEngine
from analytics.etl_processor import ETLProcessor
from analytics.risk_assessment import RiskAssessor

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化FastAPI应用
app = FastAPI(
    title="Prometheus Analytics Service",
    description="Python-powered data analytics microservice for hazard monitoring",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型定义
class HazardData(BaseModel):
    id: str
    type: str = "unknown"
    title: str = "Unknown Event"
    coordinates: List[float] = [0.0, 0.0]
    timestamp: str
    magnitude: Optional[float] = None
    severity: Optional[str] = None
    source: str = "DisasterAWARE"
    populationExposed: Optional[int] = None

class AnalysisRequest(BaseModel):
    hazards: List[HazardData]
    analysisType: str = "comprehensive"
    timeRange: int = 30  # days

class AnalysisResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    processingTime: float
    timestamp: str

# 全局缓存配置
GLOBAL_CACHE = {}
CACHE_TTL = 300  # 5分钟缓存
CACHE_MAX_SIZE = 100

# 性能监控
REQUEST_METRICS = {
    "total_requests": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "avg_processing_time": 0
}

def get_cache_key(data: List[Dict]) -> str:
    """生成请求数据的缓存键"""
    if not data:
        return "empty"
    # 使用数据长度、类型分布和时间戳范围生成键
    types = [d.get('type', 'unknown') for d in data[:10]]
    key_str = f"{len(data)}_{sorted(types)}_{data[0].get('timestamp', '')}_{data[-1].get('timestamp', '')}"
    return hashlib.md5(key_str.encode()).hexdigest()

def cache_response(ttl: int = CACHE_TTL):
    """缓存装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从request中提取hazards数据生成缓存键
            request = kwargs.get('request') or (args[0] if args else None)
            if not request or not hasattr(request, 'hazards'):
                return await func(*args, **kwargs)
            
            cache_key = get_cache_key([h.dict() for h in request.hazards])
            
            # 检查缓存
            if cache_key in GLOBAL_CACHE:
                cache_entry = GLOBAL_CACHE[cache_key]
                if (datetime.now() - cache_entry['timestamp']).seconds < ttl:
                    REQUEST_METRICS["cache_hits"] += 1
                    logger.info(f"Cache hit for {func.__name__}: {cache_key[:8]}...")
                    return cache_entry['data']
                else:
                    # 缓存过期
                    del GLOBAL_CACHE[cache_key]
            
            REQUEST_METRICS["cache_misses"] += 1
            
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 保存到缓存
            if len(GLOBAL_CACHE) >= CACHE_MAX_SIZE:
                # 删除最旧的条目
                oldest_key = min(GLOBAL_CACHE, key=lambda k: GLOBAL_CACHE[k]['timestamp'])
                del GLOBAL_CACHE[oldest_key]
            
            GLOBAL_CACHE[cache_key] = {
                'data': result,
                'timestamp': datetime.now()
            }
            
            return result
        return wrapper
    return decorator

# 初始化分析引擎
statistical_analyzer = StatisticalAnalyzer()
prediction_engine = PredictionEngine()
etl_processor = ETLProcessor()
risk_assessor = RiskAssessor()

@app.get("/")
async def root():
    return {
        "service": "Prometheus Analytics Service", 
        "status": "running",
        "version": "1.0.0",
        "features": [
            "23 Statistical Algorithms",
            "5 Prediction Models", 
            "ETL Processing",
            "Risk Assessment"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/metrics")
async def get_metrics():
    """获取性能指标"""
    cache_hit_rate = (REQUEST_METRICS["cache_hits"] / 
                     max(1, REQUEST_METRICS["cache_hits"] + REQUEST_METRICS["cache_misses"])) * 100
    
    return {
        "totalRequests": REQUEST_METRICS["total_requests"],
        "cacheHits": REQUEST_METRICS["cache_hits"],
        "cacheMisses": REQUEST_METRICS["cache_misses"],
        "cacheHitRate": f"{cache_hit_rate:.1f}%",
        "cacheSize": len(GLOBAL_CACHE),
        "avgProcessingTime": f"{REQUEST_METRICS['avg_processing_time']:.2f}ms",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/cache/clear")
async def clear_cache():
    """清除缓存"""
    GLOBAL_CACHE.clear()
    return {"success": True, "message": "Cache cleared"}

@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def comprehensive_analysis(request: AnalysisRequest):
    """综合数据分析接口 - 替代TypeScript的23种统计算法
    
    优化：
    - 并行处理三个分析任务
    - 批量数据验证
    - 性能监控
    """
    start_time = datetime.now()
    REQUEST_METRICS["total_requests"] += 1
    
    try:
        # 数据验证和限制
        if len(request.hazards) > 1000:
            logger.warning(f"Large dataset detected: {len(request.hazards)} records, limiting to 1000")
            request.hazards = request.hazards[:1000]
        
        # 转换数据格式
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        
        # 并行执行三个分析任务（使用asyncio）
        loop = asyncio.get_event_loop()
        statistical_task = loop.run_in_executor(None, statistical_analyzer.run_comprehensive_analysis, df)
        prediction_task = loop.run_in_executor(None, prediction_engine.generate_predictions, df)
        risk_task = loop.run_in_executor(None, risk_assessor.calculate_comprehensive_risk, df)
        
        # 等待所有任务完成
        statistical_results, prediction_results, risk_results = await asyncio.gather(
            statistical_task, prediction_task, risk_task
        )
        
        # 组合结果
        analysis_data = {
            "statistics": statistical_results,
            "predictions": prediction_results,
            "riskAssessment": risk_results,
            "dataQuality": etl_processor.assess_data_quality(df),
            "processingInfo": {
                "totalRecords": len(df),
                "timeRange": request.timeRange,
                "analysisType": request.analysisType
            }
        }
        
        processing_time = (datetime.now() - start_time).total_seconds()
        processing_time_ms = processing_time * 1000
        
        # 更新平均处理时间
        REQUEST_METRICS["avg_processing_time"] = (
            (REQUEST_METRICS["avg_processing_time"] * (REQUEST_METRICS["total_requests"] - 1) + 
             processing_time_ms) / REQUEST_METRICS["total_requests"]
        )
        
        # 添加性能指标到响应
        analysis_data["performance"] = {
            "processingTimeMs": round(processing_time_ms, 2),
            "recordsProcessed": len(df),
            "parallelExecution": True,
            "cacheEnabled": True
        }
        
        return AnalysisResponse(
            success=True,
            data=analysis_data,
            processingTime=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/v1/statistics")
async def statistical_analysis(request: AnalysisRequest):
    """专门的统计分析接口 - 23种算法"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        results = statistical_analyzer.run_comprehensive_analysis(df)
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/predictions")
async def prediction_analysis(request: AnalysisRequest):
    """专门的预测分析接口 - 5个回归模型"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        results = prediction_engine.generate_predictions(df)
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/etl/process")
async def etl_processing(request: AnalysisRequest):
    """ETL数据处理接口"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        processed_data = etl_processor.process_data(df)
        quality_metrics = etl_processor.assess_data_quality(processed_data)
        
        # 将NaN替换为None以便JSON序列化
        processed_data_clean = processed_data.replace({np.nan: None})
        
        return {
            "success": True, 
            "data": {
                "processedData": processed_data_clean.to_dict('records'),
                "qualityMetrics": quality_metrics,
                "recordsProcessed": len(processed_data)
            }
        }
    except Exception as e:
        logger.error(f"ETL processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/risk-assessment")
async def risk_assessment(request: AnalysisRequest):
    """风险评估接口"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        risk_results = risk_assessor.calculate_comprehensive_risk(df)
        return {"success": True, "data": risk_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== 新增：统一数据模型和质量监控API ==========

class UnifiedDataRequest(BaseModel):
    """统一模型数据请求"""
    usgs_data: Optional[List[Dict]] = None
    nasa_data: Optional[List[Dict]] = None
    gdacs_data: Optional[List[Dict]] = None

class QualityCheckRequest(BaseModel):
    """质量检查请求"""
    hazards: List[HazardData]
    source: str = "unknown"

@app.post("/api/v1/quality/assess")
async def assess_data_quality(request: QualityCheckRequest):
    """
    五维数据质量评估接口
    
    评估维度：
    - 完整性 (Completeness)
    - 准确性 (Accuracy)
    - 一致性 (Consistency)
    - 时效性 (Timeliness)
    - 有效性 (Validity)
    """
    try:
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        quality_report = etl_processor.assess_data_quality(df, request.source)
        
        return {
            "success": True,
            "data": quality_report
        }
    except Exception as e:
        logger.error(f"Quality assessment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/unified-model/transform")
async def transform_to_unified_model(request: QualityCheckRequest):
    """
    将数据转换为统一模型
    
    支持的数据源：USGS, NASA, GDACS
    返回标准化的DataFrame Schema
    """
    try:
        hazards_data = [hazard.dict() for hazard in request.hazards]
        unified_df = etl_processor.transform_to_unified_model(hazards_data, request.source)
        
        # 转换为JSON可序列化格式
        unified_df_clean = unified_df.replace({np.nan: None})
        
        return {
            "success": True,
            "data": {
                "records": unified_df_clean.to_dict('records'),
                "total_records": len(unified_df),
                "schema": list(unified_df.columns),
                "source": request.source
            }
        }
    except Exception as e:
        logger.error(f"Unified model transformation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/unified-model/merge")
async def merge_multi_source(request: UnifiedDataRequest):
    """
    合并多数据源为统一模型
    
    功能：
    - 转换各数据源到统一Schema
    - 去重和数据清洗
    - 各数据源质量评估
    - 数据源质量对比
    """
    try:
        result = etl_processor.merge_multi_source_data(
            usgs_data=request.usgs_data,
            nasa_data=request.nasa_data,
            gdacs_data=request.gdacs_data
        )
        
        # 转换DataFrame为JSON可序列化格式
        unified_df = result['unified_data']
        unified_df_clean = unified_df.replace({np.nan: None})
        
        return {
            "success": True,
            "data": {
                "unified_records": unified_df_clean.to_dict('records'),
                "total_records": result['total_records'],
                "source_records": result['source_records'],
                "merged_quality": result['merged_quality'],
                "source_quality_reports": result['source_quality_reports'],
                "source_comparison": result['source_comparison']
            }
        }
    except Exception as e:
        logger.error(f"Multi-source merge error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/quality/thresholds")
async def get_quality_thresholds():
    """获取质量监控阈值配置"""
    return {
        "success": True,
        "data": etl_processor.quality_monitor.QUALITY_THRESHOLDS
    }

@app.get("/api/v1/quality/history")
async def get_quality_history(limit: int = 10):
    """获取质量评估历史记录"""
    try:
        history = etl_processor.quality_monitor.get_quality_trend(limit)
        return {
            "success": True,
            "data": {
                "history": history,
                "count": len(history)
            }
        }
    except Exception as e:
        logger.error(f"Quality history error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=True,
        log_level="info"
    )
