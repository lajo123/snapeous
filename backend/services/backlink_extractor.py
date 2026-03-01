"""Backlink extractor service - scrapes pages to find links to target domains."""

import asyncio
import re
from urllib.parse import urljoin, urlparse
from typing import Optional, List, Dict, Any
import httpx
from bs4 import BeautifulSoup


async def extract_backlink_info(source_url: str, target_domains: List[str]) -> Optional[Dict[str, Any]]:
    """
    Scrapes a source URL to find links to target domains.
    
    Returns:
        {
            'target_url': str,  # The URL found on the page that matches a target domain
            'anchor_text': str,  # The anchor text of the link
            'link_type': str,   # 'dofollow' or 'nofollow'
        }
    """
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(source_url)
            
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            links = soup.find_all('a', href=True)
            
            # Normalize target domains
            normalized_targets = [d.lower().replace('www.', '') for d in target_domains]
            
            for link in links:
                href = link['href']
                
                # Handle relative URLs
                if href.startswith('/'):
                    parsed_source = urlparse(source_url)
                    href = f"{parsed_source.scheme}://{parsed_source.netloc}{href}"
                elif href.startswith('#') or href.startswith('javascript:'):
                    continue
                elif not href.startswith('http'):
                    href = urljoin(source_url, href)
                
                parsed_href = urlparse(href)
                link_domain = parsed_href.netloc.lower().replace('www.', '')
                
                # Check if this link points to one of our target domains
                if link_domain in normalized_targets:
                    anchor_text = link.get_text(strip=True) or ''
                    
                    # Check if nofollow
                    rel_attr = link.get('rel', [])
                    if isinstance(rel_attr, str):
                        rel_attr = rel_attr.split()
                    
                    link_type = 'nofollow' if 'nofollow' in rel_attr else 'dofollow'
                    
                    return {
                        'target_url': href,
                        'anchor_text': anchor_text[:512] if anchor_text else None,  # Limit length
                        'link_type': link_type,
                    }
            
            return None
            
    except Exception as e:
        print(f"Error extracting backlink info from {source_url}: {e}")
        return None


async def count_links_on_page_detailed(source_url: str) -> Dict[str, Any]:
    """
    Get detailed info about a page including total link count.
    
    Returns:
        {
            'http_code': int,
            'links_on_page': int,
            'title': str,
        }
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(source_url)
            
            soup = BeautifulSoup(response.text, 'html.parser')
            links = soup.find_all('a', href=True)
            title = soup.title.string if soup.title else None
            
            return {
                'http_code': response.status_code,
                'links_on_page': len(links),
                'title': title[:512] if title else None,
            }
            
    except Exception as e:
        return {
            'http_code': None,
            'links_on_page': None,
            'title': None,
        }


async def validate_and_enrich_backlink(source_url: str, project_domains: List[str]) -> Optional[Dict[str, Any]]:
    """
    Validates a backlink and enriches it with automatically detected data.
    
    Args:
        source_url: The URL where the backlink supposedly exists
        project_domains: List of domains belonging to the project
    
    Returns:
        Enriched backlink data or None if no link found
    """
    # First, check if the page is accessible and get basic info
    page_info = await count_links_on_page_detailed(source_url)
    
    if page_info['http_code'] != 200:
        return {
            'source_url': source_url,
            'http_code': page_info['http_code'],
            'links_on_page': page_info['links_on_page'],
            'status': 'lost' if page_info['http_code'] in [404, 410] else 'pending',
            'found': False,
        }
    
    # Try to find the backlink on the page
    link_info = await extract_backlink_info(source_url, project_domains)
    
    if link_info:
        return {
            'source_url': source_url,
            'target_url': link_info['target_url'],
            'anchor_text': link_info['anchor_text'],
            'link_type': link_info['link_type'],
            'http_code': page_info['http_code'],
            'links_on_page': page_info['links_on_page'],
            'status': 'active',
            'found': True,
        }
    else:
        # Page is accessible but no link to our domain found
        return {
            'source_url': source_url,
            'http_code': page_info['http_code'],
            'links_on_page': page_info['links_on_page'],
            'status': 'lost',
            'found': False,
        }


async def process_backlinks_batch(
    items: List[Dict[str, str]], 
    project_domains: List[str],
    max_concurrent: int = 5
) -> List[Dict[str, Any]]:
    """
    Process multiple backlinks in parallel with concurrency limit.
    
    Args:
        items: List of dicts with 'source_url' key
        project_domains: List of project domains
        max_concurrent: Maximum number of concurrent requests
    
    Returns:
        List of results for each URL
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def process_single(item: Dict[str, str]) -> Dict[str, Any]:
        async with semaphore:
            try:
                source_url = item.get('source_url', '').strip()
                if not source_url:
                    return {
                        'source_url': '',
                        'error': 'URL vide',
                        'found': False,
                    }
                
                result = await validate_and_enrich_backlink(source_url, project_domains)
                return result or {
                    'source_url': source_url,
                    'error': 'Impossible de scraper la page',
                    'found': False,
                }
            except Exception as e:
                return {
                    'source_url': item.get('source_url', ''),
                    'error': str(e),
                    'found': False,
                }
    
    # Process all items in parallel with concurrency limit
    tasks = [process_single(item) for item in items]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Handle exceptions in results
    processed_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed_results.append({
                'source_url': items[i].get('source_url', ''),
                'error': str(result),
                'found': False,
            })
        else:
            processed_results.append(result)
    
    return processed_results
