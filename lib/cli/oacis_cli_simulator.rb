class OacisCli < Thor

  SIMULATOR_TEMPLATE=<<"EOS"
{
  "name": "a_sample_simulator",
  "command": "#{File.expand_path("../lib/samples/tutorial/simulator/simulator.out", File.dirname(__FILE__))}",
  "support_input_json": false,
  "support_mpi": false,
  "support_omp": false,
  "print_version_command": null,
  "pre_process_script": null,
  "executable_on_ids": [],
  "parameter_definitions": [
    {"key": "p1","type": "Integer","default": 0,"description": "parameter1"},
    {"key": "p2","type": "Float","default": 5.0,"description": "parameter2"}
  ]
}
EOS

  public
  desc 'simulator_template', "print simulator template"
  method_option :output,
    type:     :string,
    aliases:  '-o',
    desc:     'output file',
    required: true
  def simulator_template
    return if options[:dry_run]
    File.open(options[:output], 'w') {|io|
      io.puts SIMULATOR_TEMPLATE
      io.flush
    }
  end

  desc 'create_simulator', "create_simulator"
  method_option :host,
    type:     :string,
    aliases:  '-h',
    desc:     'executable hosts'
  method_option :input,
    type:     :string,
    aliases:  '-i',
    desc:     'input file',
    required: true
  method_option :output,
    type:     :string,
    aliases:  '-o',
    desc:     'output file',
    required: true
  def create_simulator
    input = JSON.load(File.read(options[:input]))

    # create a simulator
    sim = Simulator.new(input)
    input["parameter_definitions"].each do |param_def|
      sim.parameter_definitions.build(param_def)
    end
    if options[:host]
      hosts = get_host(options[:host])
      sim.executable_on += hosts
    end

    if options[:verbose]
      $stderr.puts "created_simulator :", JSON.pretty_generate(sim), ""
      $stderr.puts "parameter_definitions :", JSON.pretty_generate(sim.parameter_definitions)
    end

    if sim.valid?
      unless options[:dry_run]
        sim.save!
        write_simulator_id_to_file(options[:output], sim)
      end
    else
      $stderr.puts sim.inspect
      $stderr.puts sim.errors.full_messages
      raise "validation of simulator failed"
    end
  end

  private
  def write_simulator_id_to_file(path, simulator)
    h = {"simulator_id" => simulator.id.to_s}
    File.open(path, 'w') {|io|
      io.puts JSON.pretty_generate(h)
      io.flush
    }
  end
end
