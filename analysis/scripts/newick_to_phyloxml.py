#!/usr/bin/env python3
"""Convert Newick to PhyloXML format"""

import sys
import re

def parse_newick_to_phyloxml(newick_str):
    """Simple Newick to PhyloXML converter"""
    
    # Clean up the newick string
    newick = newick_str.strip()
    if newick.endswith(';'):
        newick = newick[:-1]
    
    def parse_node(s, pos=0):
        """Recursively parse newick and build XML"""
        children = []
        
        if pos < len(s) and s[pos] == '(':
            # Has children
            pos += 1  # skip '('
            depth = 0
            child_start = pos
            
            while pos < len(s):
                if s[pos] == '(':
                    depth += 1
                elif s[pos] == ')':
                    if depth == 0:
                        # End of children, parse last child
                        child_str = s[child_start:pos]
                        if child_str:
                            children.append(parse_subtree(child_str))
                        pos += 1  # skip ')'
                        break
                    depth -= 1
                elif s[pos] == ',' and depth == 0:
                    # Separator between children
                    child_str = s[child_start:pos]
                    if child_str:
                        children.append(parse_subtree(child_str))
                    child_start = pos + 1
                pos += 1
        
        # Parse name and branch length after children
        rest = s[pos:] if pos < len(s) else ""
        name = ""
        branch_length = None
        
        # Match name:length or just name or just :length
        match = re.match(r'^([^:,;\(\)]*)?(?::([0-9.eE+-]+))?', rest)
        if match:
            name = match.group(1) or ""
            if match.group(2):
                branch_length = match.group(2)
        
        return build_clade_xml(name.strip(), branch_length, children)
    
    def parse_subtree(s):
        """Parse a complete subtree"""
        return parse_node(s, 0)
    
    def build_clade_xml(name, branch_length, children, indent=2):
        """Build XML for a clade"""
        xml_parts = []
        spaces = "  " * indent
        
        if children:
            xml_parts.append(f"{spaces}<clade>")
        else:
            xml_parts.append(f"{spaces}<clade>")
        
        if name and name != '_':
            xml_parts.append(f"{spaces}  <name>{escape_xml(name)}</name>")
        
        if branch_length:
            xml_parts.append(f"{spaces}  <branch_length>{branch_length}</branch_length>")
        
        for child in children:
            # Re-indent child
            child_lines = child.split('\n')
            for line in child_lines:
                xml_parts.append("  " + line)
        
        xml_parts.append(f"{spaces}</clade>")
        
        return '\n'.join(xml_parts)
    
    def escape_xml(s):
        return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    # Build the full PhyloXML
    root_clade = parse_node(newick, 0)
    
    phyloxml = f'''<?xml version="1.0" encoding="UTF-8"?>
<phyloxml xmlns="http://www.phyloxml.org">
  <phylogeny rooted="true">
    <name>Converted Tree</name>
{root_clade}
  </phylogeny>
</phyloxml>'''
    
    return phyloxml

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python newick_to_phyloxml.py <input.newick> [output.xml]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.newick', '.phyloxml')
    
    with open(input_file, 'r') as f:
        newick = f.read()
    
    phyloxml = parse_newick_to_phyloxml(newick)
    
    with open(output_file, 'w') as f:
        f.write(phyloxml)
    
    print(f"Converted {input_file} to {output_file}")
    print(f"Output size: {len(phyloxml)} characters")
